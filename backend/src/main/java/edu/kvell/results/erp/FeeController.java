package edu.kvell.results.erp;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.auth.CurrentUser.Role;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Fees for students (their dues, online payment, receipts and clearance) and the payment gateway's webhook. A payment
 * counts only when the gateway confirms it.
 */
@RestController
public class FeeController {

    public record Summary(List<FeeService.Demand> demands, List<FeeService.Payment> payments, FeeService.Clearance clearance,
                          java.math.BigDecimal balance, boolean onlinePayment, boolean testGateway) {
    }

    public record PayRequest(List<Long> demandIds) {
    }

    private final FeeService fees;

    public FeeController(FeeService fees) {
        this.fees = fees;
    }

    @GetMapping("/api/erp/fees")
    Summary mine() {
        CurrentUser me = ErpSupport.require(Role.STUDENT);
        List<FeeService.Demand> demands = fees.demands(me.regNo());
        return new Summary(demands, fees.payments("p.reg_no = ? AND p.status = 'PAID'", me.regNo()), fees.clearance(me.regNo()),
                demands.stream().map(FeeService.Demand::balance).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add),
                fees.razorpay() || fees.testGateway(), fees.testGateway());
    }

    @PostMapping("/api/erp/fees/pay")
    FeeService.Order pay(@RequestBody(required = false) PayRequest req) {
        CurrentUser me = ErpSupport.require(Role.STUDENT);
        return fees.createOrder(me.regNo(), req == null ? null : req.demandIds());
    }

    /** Local testing: the simulated gateway confirms the order (refused when a real gateway is configured). */
    @PostMapping("/api/erp/fees/pay/{orderId}/test-confirm")
    FeeService.Payment testConfirm(@PathVariable String orderId) {
        CurrentUser me = ErpSupport.require(Role.STUDENT);
        return fees.testConfirm(me.regNo(), orderId);
    }

    @GetMapping("/api/erp/fees/clearance")
    FeeService.Clearance clearance(@RequestParam(required = false) String regNo) {
        CurrentUser me = ErpSupport.require(Role.STUDENT);
        return fees.clearance(me.regNo());
    }

    @GetMapping("/api/erp/fees/receipts/{receiptNo}")
    ResponseEntity<byte[]> receipt(@PathVariable String receiptNo) {
        CurrentUser me = ErpSupport.require(Role.STUDENT);
        return pdf(fees.receiptPdf(receiptNo.replace('_', '/'), me.regNo()), receiptNo);
    }

    /** Razorpay calls this when a payment is captured or fails (set the URL and secret in the Razorpay dashboard). */
    @PostMapping("/api/public/payments/razorpay-webhook")
    Map<String, String> webhook(@RequestBody String body,
                                @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {
        fees.webhook(body, signature);
        return Map.of("status", "ok");
    }

    static ResponseEntity<byte[]> pdf(byte[] bytes, String name) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + name.replace('/', '_') + ".pdf\"")
                .header("X-Content-Type-Options", "nosniff").body(bytes);
    }
}
