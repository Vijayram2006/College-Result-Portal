package edu.kvell.results.erp;

import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.notifications.NotificationService;
import edu.kvell.results.notifications.NotificationService.Audience;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Fees: dues per student and fee head (fee_demands), payments that count only when the gateway confirms them (the
 * Razorpay webhook, or the simulated test gateway when no gateway keys are configured and fees.test_gateway is on),
 * receipts, and the clearance that unlocks the hall ticket and bus pass.
 */
@Service
public class FeeService {

    public record Demand(long id, String head, String headCode, String structure, String academicYear, BigDecimal amount,
                         BigDecimal concession, BigDecimal paid, BigDecimal balance, String dueDate, boolean overdue,
                         String kind) {
    }

    public record Payment(long id, String regNo, String studentName, BigDecimal amount, String gateway, String orderId,
                          String paymentId, String status, String receiptNo, BigDecimal refunded, String createdAt,
                          String paidAt) {
    }

    public record Clearance(boolean hallTicketBlocked, boolean busPassBlocked, BigDecimal overdue, String message) {
    }

    public record Order(String orderId, BigDecimal amount, String gateway, String keyId, String studentName) {
    }

    private final JdbcClient db;
    private final ErpSupport erp;
    private final NotificationService notifications;
    private final AuditService audit;
    private final ObjectMapper json;
    private final String keyId;
    private final String keySecret;
    private final String webhookSecret;

    public FeeService(JdbcClient db, ErpSupport erp, NotificationService notifications, AuditService audit,
                      ObjectMapper json,
                      @Value("${app.razorpay.key-id:}") String keyId,
                      @Value("${app.razorpay.key-secret:}") String keySecret,
                      @Value("${app.razorpay.webhook-secret:}") String webhookSecret) {
        this.db = db;
        this.erp = erp;
        this.notifications = notifications;
        this.audit = audit;
        this.json = json;
        this.keyId = keyId;
        this.keySecret = keySecret;
        this.webhookSecret = webhookSecret;
    }

    public boolean razorpay() {
        return !keyId.isBlank() && !keySecret.isBlank() && !webhookSecret.isBlank();
    }

    /** The simulated gateway: only without real gateway keys and while fees.test_gateway is on (local testing). */
    public boolean testGateway() {
        return !razorpay() && erp.boolSetting("fees.test_gateway");
    }

    public List<Demand> demands(String regNo) {
        return db.sql("""
                        SELECT d.id, h.name || coalesce(' – ' || r.name, '') AS name, h.code, s.title, s.academic_year, d.amount,
                               d.concession, d.paid, d.due_date, s.kind
                        FROM fee_demands d JOIN fee_heads h ON h.id = d.head_id JOIN fee_structures s ON s.id = d.structure_id
                        LEFT JOIN fee_service_rates r ON r.id = d.service_rate_id
                        WHERE d.reg_no = ? ORDER BY d.due_date, h.code
                        """).param(regNo)
                .query((rs, n) -> {
                    BigDecimal balance = rs.getBigDecimal("amount").subtract(rs.getBigDecimal("concession")).subtract(rs.getBigDecimal("paid"));
                    LocalDate due = rs.getObject("due_date", LocalDate.class);
                    return new Demand(rs.getLong("id"), rs.getString("name"), rs.getString("code"), rs.getString("title"),
                            rs.getString("academic_year"), rs.getBigDecimal("amount"), rs.getBigDecimal("concession"),
                            rs.getBigDecimal("paid"), balance, due.toString(), balance.signum() > 0 && due.isBefore(ErpSupport.today()),
                            rs.getString("kind"));
                })
                .list();
    }

    public List<Payment> payments(String where, Object... params) {
        return db.sql("""
                        SELECT p.*, s.name FROM fee_payments p JOIN students s ON s.reg_no = p.reg_no
                        WHERE """ + " " + where + " " + """
                         ORDER BY p.created_at DESC LIMIT 2000
                        """).params(params)
                .query((rs, n) -> new Payment(rs.getLong("id"), rs.getString("reg_no"), rs.getString("name"),
                        rs.getBigDecimal("amount"), rs.getString("gateway"), rs.getString("gateway_order_id"),
                        rs.getString("gateway_payment_id"), rs.getString("status"), rs.getString("receipt_no"),
                        rs.getBigDecimal("refunded"), ErpSupport.display(rs.getObject("created_at", OffsetDateTime.class)),
                        ErpSupport.display(rs.getObject("paid_at", OffsetDateTime.class))))
                .list();
    }

    /** Overdue dues block the hall ticket and the bus pass until they are paid. */
    public Clearance clearance(String regNo) {
        List<Demand> all = demands(regNo);
        BigDecimal overdue = all.stream().filter(Demand::overdue).map(Demand::balance).reduce(BigDecimal.ZERO, BigDecimal::add);
        // The end-semester exam fee must be paid before the hall ticket, even before its due date
        BigDecimal examUnpaid = all.stream().filter(d -> "EXAM".equals(d.kind())).map(Demand::balance)
                .filter(b -> b.signum() > 0).reduce(BigDecimal.ZERO, BigDecimal::add);
        boolean busBlocked = overdue.signum() > 0;
        boolean hallBlocked = busBlocked || examUnpaid.signum() > 0;
        String message;
        if (busBlocked) {
            message = "Fees of ₹" + overdue + " are overdue. The hall ticket and bus pass are blocked until they are paid.";
        } else if (hallBlocked) {
            message = "Exam fee of ₹" + examUnpaid + " is unpaid. The hall ticket is released once it is paid.";
        } else {
            message = "No overdue fees. The hall ticket and bus pass are open.";
        }
        return new Clearance(hallBlocked, busBlocked, overdue, message);
    }

    /** Starts a payment of the chosen dues (all open dues when none are chosen): a gateway order for their balance. */
    @Transactional
    public Order createOrder(String regNo, List<Long> demandIds) {
        List<Demand> open = demands(regNo).stream().filter(d -> d.balance().signum() > 0)
                .filter(d -> demandIds == null || demandIds.isEmpty() || demandIds.contains(d.id())).toList();
        if (open.isEmpty()) throw ApiException.badRequest("There are no dues to pay");
        BigDecimal total = open.stream().map(Demand::balance).reduce(BigDecimal.ZERO, BigDecimal::add);
        List<Map<String, Object>> allocation = new ArrayList<>();
        for (Demand d : open) allocation.add(Map.of("demandId", d.id(), "amount", d.balance()));
        String gateway;
        String orderId;
        if (razorpay()) {
            gateway = "RAZORPAY";
            orderId = razorpayOrder(total, regNo);
        } else if (testGateway()) {
            gateway = "TEST";
            orderId = "test_order_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        } else {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Online payment is not set up yet. Please pay at the Accounts office.");
        }
        db.sql("""
                        INSERT INTO fee_payments (reg_no, amount, gateway, gateway_order_id, allocation)
                        VALUES (?, ?, ?, ?, CAST(? AS JSONB))
                        """).params(regNo, total, gateway, orderId, json.writeValueAsString(allocation)).update();
        String name = db.sql("SELECT name FROM students WHERE reg_no = ?").param(regNo).query(String.class).single();
        return new Order(orderId, total, gateway, razorpay() ? keyId : null, name);
    }

    /** The Razorpay webhook: the signature (HMAC-SHA256 of the raw body with the webhook secret) must match. */
    @Transactional // confirm() is called on this object, so its own @Transactional does not apply
    public void webhook(String body, String signature) {
        if (!razorpay()) throw new ApiException(HttpStatus.NOT_FOUND, "Not configured");
        String expected = hmac(webhookSecret, body);
        if (signature == null || !MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                signature.trim().getBytes(StandardCharsets.UTF_8))) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid signature");
        }
        JsonNode root = json.readTree(body);
        String event = root.path("event").asText("");
        JsonNode payment = root.path("payload").path("payment").path("entity");
        String orderId = payment.path("order_id").asText("");
        if (orderId.isEmpty()) return;
        if (event.equals("payment.captured") || event.equals("order.paid")) {
            confirm(orderId, payment.path("id").asText(""), payment.path("amount").asLong(0));
        } else if (event.equals("payment.failed")) {
            db.sql("UPDATE fee_payments SET status = 'FAILED' WHERE gateway_order_id = ? AND status = 'CREATED'").param(orderId).update();
        }
    }

    /** Local testing only: the simulated gateway confirms the student's own order. */
    @Transactional
    public Payment testConfirm(String regNo, String orderId) {
        if (!testGateway()) throw new ApiException(HttpStatus.NOT_FOUND, "Not available");
        Map<String, Object> p = db.sql("SELECT amount, reg_no, gateway FROM fee_payments WHERE gateway_order_id = ?").param(orderId)
                .query().listOfRows().stream().findFirst().orElseThrow(() -> ApiException.notFound("Order not found"));
        if (!regNo.equals(p.get("reg_no")) || !"TEST".equals(p.get("gateway"))) throw ApiException.notFound("Order not found");
        long paise = ((BigDecimal) p.get("amount")).movePointRight(2).longValueExact();
        confirm(orderId, "test_pay_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14), paise);
        return payments("p.gateway_order_id = ?", orderId).getFirst();
    }

    /** The gateway confirmed a payment: dues are cleared, a receipt is issued, the student and parent are told. */
    @Transactional
    public void confirm(String orderId, String paymentId, long amountPaise) {
        Map<String, Object> p = db.sql("SELECT * FROM fee_payments WHERE gateway_order_id = ? FOR UPDATE").param(orderId)
                .query().listOfRows().stream().findFirst().orElse(null);
        if (p == null || "PAID".equals(p.get("status"))) return; // unknown or already confirmed (webhooks can repeat)
        BigDecimal amount = (BigDecimal) p.get("amount");
        if (amount.movePointRight(2).longValue() != amountPaise) {
            throw ApiException.badRequest("The paid amount does not match the order");
        }
        String regNo = (String) p.get("reg_no");
        // A due may have been paid by another order (two open payment pages) or reduced by a concession since this
        // order was made: only what is still open is applied, and the allocation records what was actually applied
        JsonNode allocation = json.readTree(p.get("allocation").toString());
        List<Map<String, Object>> applied = new ArrayList<>();
        BigDecimal appliedTotal = BigDecimal.ZERO;
        for (JsonNode a : allocation) {
            long demandId = a.path("demandId").asLong();
            BigDecimal open = db.sql("SELECT amount - concession - paid FROM fee_demands WHERE id = ? AND reg_no = ? FOR UPDATE")
                    .params(demandId, regNo).query(BigDecimal.class).optional().orElse(BigDecimal.ZERO);
            BigDecimal take = a.path("amount").decimalValue().min(open).max(BigDecimal.ZERO);
            if (take.signum() == 0) continue;
            db.sql("UPDATE fee_demands SET paid = paid + ? WHERE id = ?").params(take, demandId).update();
            applied.add(Map.of("demandId", demandId, "amount", take));
            appliedTotal = appliedTotal.add(take);
        }
        long id = ((Number) p.get("id")).longValue();
        String receipt = "KV/RCPT/" + ErpSupport.today().getYear() + "/" + String.format("%06d", id);
        db.sql("""
                        UPDATE fee_payments SET status = 'PAID', gateway_payment_id = ?, paid_at = now(), receipt_no = ?,
                            allocation = CAST(? AS JSONB)
                        WHERE id = ?
                        """).params(paymentId, receipt, json.writeValueAsString(applied), id).update();
        BigDecimal excess = amount.subtract(appliedTotal);
        if (excess.signum() > 0) {
            // The money was received, so it is kept on record and a refund of the excess goes to the Accounts head
            db.sql("INSERT INTO fee_refunds (reg_no, payment_id, amount, reason, requested_by) VALUES (?, ?, ?, ?, 'system')")
                    .params(regNo, id, excess, "Paid ₹" + excess + " more than the open dues (receipt " + receipt
                            + "), e.g. the same dues paid twice. Refund the excess.").update();
            notifications.notify(Audience.ACCOUNTS, db.sql("SELECT dept_key FROM students WHERE reg_no = ?").param(regNo)
                            .query(String.class).single(), null, "Approval needed: refund of excess payment",
                    regNo + " paid ₹" + excess + " more than the open dues (receipt " + receipt + ").", "accounts-approvals");
        }
        Map<String, Object> s = db.sql("SELECT name, dept_key, parent_phone FROM students WHERE reg_no = ?").param(regNo)
                .query().singleRow();
        Long userId = db.sql("SELECT id FROM users WHERE reg_no = ? AND role = 'STUDENT'").param(regNo).query(Long.class)
                .optional().orElse(null);
        String msg = "Fee payment of ₹" + amount + " received (receipt " + receipt + "). Thank you.";
        if (userId != null) notifications.notifyUser(userId, Audience.STUDENT, (String) s.get("dept_key"), null, "Fee payment received", msg, "fees");
        if (s.get("parent_phone") != null) {
            db.sql("INSERT INTO message_outbox (channel, to_phone, body, ref) VALUES ('WHATSAPP', ?, ?, ?)")
                    .params(s.get("parent_phone"), "KVELL: " + s.get("name") + " (" + regNo + ") paid ₹" + amount
                            + " (receipt " + receipt + ").", receipt).update();
        }
        audit.record("gateway", "Payment gateway", "FEE_PAYMENT_CONFIRMED", regNo,
                "The gateway confirmed ₹" + amount + " for " + regNo + " (order " + orderId + ", receipt " + receipt + ").", null);
    }

    /** The receipt of a confirmed payment as a PDF. */
    public byte[] receiptPdf(String receiptNo, String regNoOrNull) {
        Map<String, Object> p = db.sql("""
                        SELECT p.*, s.name, s.dept_key, d.name AS dept_name FROM fee_payments p
                        JOIN students s ON s.reg_no = p.reg_no JOIN departments d ON d.dept_key = s.dept_key
                        WHERE p.receipt_no = ? AND p.status = 'PAID'
                        """).param(receiptNo).query().listOfRows().stream().findFirst()
                .orElseThrow(() -> ApiException.notFound("Receipt not found"));
        if (regNoOrNull != null && !regNoOrNull.equals(p.get("reg_no"))) throw ApiException.notFound("Receipt not found");
        JsonNode allocation = json.readTree(p.get("allocation").toString());
        Map<String, BigDecimal> lines = new LinkedHashMap<>();
        for (JsonNode a : allocation) {
            String head = db.sql("""
                            SELECT h.name || coalesce(' – ' || r.name, '') FROM fee_demands d JOIN fee_heads h ON h.id = d.head_id
                            LEFT JOIN fee_service_rates r ON r.id = d.service_rate_id WHERE d.id = ?
                            """)
                    .param(a.path("demandId").asLong()).query(String.class).optional().orElse("Fee");
            lines.merge(head, a.path("amount").decimalValue(), BigDecimal::add);
        }
        BigDecimal excess = ((BigDecimal) p.get("amount")).subtract(lines.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add));
        if (excess.signum() > 0) lines.put("Excess (to be refunded)", excess);
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A5);
            doc.addPage(page);
            PDType1Font bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            float y = page.getMediaBox().getHeight() - 50;
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                y = line(cs, bold, 14, 40, y, "KVELL UNIVERSITY - FEE RECEIPT");
                y = line(cs, regular, 9, 40, y - 4, "Karpaga Vinayaga Educational Group");
                y -= 14;
                y = line(cs, regular, 10, 40, y, "Receipt no: " + receiptNo);
                y = line(cs, regular, 10, 40, y, "Date: " + ErpSupport.display((OffsetDateTime) toOffset(p.get("paid_at"))));
                y = line(cs, regular, 10, 40, y, "Student: " + p.get("name") + " (" + p.get("reg_no") + ")");
                y = line(cs, regular, 10, 40, y, "Department: " + p.get("dept_name"));
                y = line(cs, regular, 10, 40, y, "Payment ref: " + p.get("gateway_payment_id") + " (" + p.get("gateway") + ")");
                y -= 10;
                y = line(cs, bold, 10, 40, y, "Fee head                                   Amount (Rs.)");
                for (Map.Entry<String, BigDecimal> e : lines.entrySet()) {
                    y = line(cs, regular, 10, 40, y, pad(e.getKey(), 42) + e.getValue().setScale(2, RoundingMode.HALF_UP));
                }
                y -= 6;
                y = line(cs, bold, 11, 40, y, pad("Total paid", 42) + ((BigDecimal) p.get("amount")).setScale(2, RoundingMode.HALF_UP));
                y -= 20;
                line(cs, regular, 8, 40, y, "Computer-generated receipt; confirmed by the payment gateway. No signature required.");
            }
            doc.save(out);
            return out.toByteArray();
        } catch (java.io.IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static Object toOffset(Object v) {
        if (v instanceof java.sql.Timestamp ts) return ts.toInstant().atOffset(java.time.ZoneOffset.UTC);
        return v;
    }

    private static float line(PDPageContentStream cs, PDType1Font font, float size, float x, float y, String text)
            throws java.io.IOException {
        cs.beginText();
        cs.setFont(font, size);
        cs.newLineAtOffset(x, y);
        // The standard fonts have no rupee sign
        cs.showText(text.replace("₹", "Rs. ").replaceAll("[^\\x20-\\x7E]", "-"));
        cs.endText();
        return y - size - 5;
    }

    private static String pad(String s, int n) {
        return s.length() >= n ? s.substring(0, n - 1) + " " : s + " ".repeat(n - s.length());
    }

    private String razorpayOrder(BigDecimal total, String regNo) {
        try {
            String body = json.writeValueAsString(Map.of("amount", total.movePointRight(2).longValueExact(), "currency", "INR",
                    "receipt", regNo + "-" + System.currentTimeMillis()));
            HttpRequest req = HttpRequest.newBuilder(URI.create("https://api.razorpay.com/v1/orders"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Basic " + Base64.getEncoder().encodeToString((keyId + ":" + keySecret)
                            .getBytes(StandardCharsets.UTF_8)))
                    .POST(HttpRequest.BodyPublishers.ofString(body)).build();
            HttpResponse<String> res = HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() / 100 != 2) throw new ApiException(HttpStatus.BAD_GATEWAY, "The payment gateway did not accept the order");
            return json.readTree(res.body()).path("id").asText();
        } catch (java.io.IOException | InterruptedException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "The payment gateway could not be reached");
        }
    }

    static String hmac(String secret, String body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
