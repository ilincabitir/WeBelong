package com.webelong.backend.controller;

import com.webelong.backend.dto.PublicUserResponse;
import com.webelong.backend.dto.UpdateProfileRequest;
import com.webelong.backend.dto.UserResponse;
import com.webelong.backend.model.User;
import com.webelong.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/{id}")
    public PublicUserResponse getProfile(@PathVariable Long id) {
        return userService.getProfile(id);
    }

    @GetMapping
    public List<PublicUserResponse> search(@RequestParam("q") String q,
                                           @AuthenticationPrincipal User current) {
        return userService.search(q, current.getId());
    }

    @PutMapping("/me")
    public UserResponse updateMe(@AuthenticationPrincipal User current,
                                 @Valid @RequestBody UpdateProfileRequest req) {
        return userService.updateMe(current, req);
    }
}