package edu.kvell.results.notifications;

import edu.kvell.results.auth.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The signed-in user's own notifications (any role). */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notifications;

    public NotificationController(NotificationService notifications) {
        this.notifications = notifications;
    }

    @GetMapping
    NotificationService.Inbox inbox() {
        return notifications.inbox(CurrentUser.get(), 30);
    }

    @PostMapping("/{id}/read")
    ResponseEntity<Void> read(@PathVariable long id) {
        notifications.markRead(CurrentUser.get(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/read-all")
    ResponseEntity<Void> readAll() {
        notifications.markAllRead(CurrentUser.get());
        return ResponseEntity.noContent().build();
    }
}
