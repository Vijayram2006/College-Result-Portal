package edu.kvell.results.hod;

import edu.kvell.results.auth.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/hod")
public class HodController {

    private final HodService hod;

    public HodController(HodService hod) {
        this.hod = hod;
    }

    /** The department comes from the HOD's account, so a HOD cannot view other departments. */
    @GetMapping("/overview")
    HodService.Overview overview() {
        return hod.overview(CurrentUser.get().deptKey());
    }
}
