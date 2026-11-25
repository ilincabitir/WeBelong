package com.webelong.backend.service;

import com.webelong.backend.dto.PublicUserResponse;
import com.webelong.backend.dto.UpdateProfileRequest;
import com.webelong.backend.dto.UserResponse;
import com.webelong.backend.exception.ApiException;
import com.webelong.backend.model.User;
import com.webelong.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final Set<String> ALLOWED_FONTS = Set.of(
            "system-ui",
            "Georgia",
            "Verdana",
            "Trebuchet MS",
            "Courier New",
            "Times New Roman"
    );

    private final UserRepository users;

    @Transactional(readOnly = true)
    public PublicUserResponse getProfile(Long id) {
        User user = users.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return PublicUserResponse.from(user);
    }

    @Transactional
    public UserResponse updateMe(User current, UpdateProfileRequest req) {
        // Re-load inside the transaction: the principal came from the JWT filter
        // and is detached because open-in-view is disabled.
        User user = users.findById(current.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        String displayName = req.displayName().trim();
        if (displayName.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Display name is required");
        }
        if (!ALLOWED_FONTS.contains(req.fontFamily())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported font");
        }

        user.setDisplayName(displayName);
        user.setBio(blankToNull(req.bio()));
        user.setAvatarUrl(blankToNull(req.avatarUrl()));
        user.setCoverUrl(blankToNull(req.coverUrl()));
        user.setThemeColor(req.themeColor());
        user.setFontFamily(req.fontFamily());

        // Managed entity: dirty checking writes the UPDATE at commit.
        return UserResponse.from(user);
    }

    @Transactional(readOnly = true)
    public List<PublicUserResponse> search(String q, Long currentUserId) {
        if (q == null || q.isBlank()) {
            return List.of();
        }

        String pattern = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";

        return users.search(currentUserId, pattern, PageRequest.of(0, 20))
                .stream()
                .map(PublicUserResponse::from)
                .toList();
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}