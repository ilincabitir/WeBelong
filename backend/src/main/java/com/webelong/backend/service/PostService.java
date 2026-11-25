package com.webelong.backend.service;

import com.webelong.backend.dto.CommentRequest;
import com.webelong.backend.dto.CommentResponse;
import com.webelong.backend.dto.PageResponse;
import com.webelong.backend.dto.PostRequest;
import com.webelong.backend.dto.PostResponse;
import com.webelong.backend.exception.ApiException;
import com.webelong.backend.model.Comment;
import com.webelong.backend.model.Post;
import com.webelong.backend.model.User;
import com.webelong.backend.repository.CommentRepository;
import com.webelong.backend.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PostService {

    // Must match UserService's allow-list and the frontend Select options.
    private static final Set<String> ALLOWED_FONTS = Set.of(
            "system-ui",
            "Georgia",
            "Verdana",
            "Trebuchet MS",
            "Courier New",
            "Times New Roman"
    );

    private static final String DEFAULT_BACKGROUND = "#ffffff";
    private static final String DEFAULT_TEXT_COLOR = "#1f1f1f";
    private static final String DEFAULT_FONT = "system-ui";

    private final PostRepository posts;
    private final CommentRepository comments;
    private final FriendshipService friendships;

    /* ----------------------------- Posts ----------------------------- */

    @Transactional
    public PostResponse create(User current, PostRequest req) {
        String content = blankToNull(req.content());
        String imageUrl = blankToNull(req.imageUrl());

        if (content == null && imageUrl == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "A post needs text or an image");
        }

        Post post = Post.builder()
                .author(current)
                .content(content)
                .imageUrl(imageUrl)
                .backgroundColor(orDefault(req.backgroundColor(), DEFAULT_BACKGROUND))
                .textColor(orDefault(req.textColor(), DEFAULT_TEXT_COLOR))
                .fontFamily(validateFont(req.fontFamily()))
                .build();

        posts.save(post);
        return PostResponse.from(post);
    }

    @Transactional
    public PostResponse update(User current, Long postId, PostRequest req) {
        Post post = findPost(postId);
        requireAuthor(post, current);

        String content = blankToNull(req.content());
        String imageUrl = blankToNull(req.imageUrl());

        if (content == null && imageUrl == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "A post needs text or an image");
        }

        post.setContent(content);
        post.setImageUrl(imageUrl);
        post.setBackgroundColor(orDefault(req.backgroundColor(), DEFAULT_BACKGROUND));
        post.setTextColor(orDefault(req.textColor(), DEFAULT_TEXT_COLOR));
        post.setFontFamily(validateFont(req.fontFamily()));

        // Managed entity: dirty checking writes the update; @PreUpdate sets updatedAt.
        return PostResponse.from(post);
    }

    @Transactional
    public void delete(User current, Long postId) {
        Post post = findPost(postId);
        requireAuthor(post, current);

        comments.deleteByPostId(postId);
        posts.delete(post);
    }

    @Transactional(readOnly = true)
    public PostResponse get(User viewer, Long postId) {
        Post post = findPost(postId);
        requireCanView(post, viewer);
        return PostResponse.from(post);
    }

    /* ----------------------------- Feed ----------------------------- */

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> feed(User current, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        Pageable pageable = PageRequest.of(safePage, safeSize);

        List<Long> friendIds = friendships.friendIds(current.getId());

        if (friendIds.isEmpty()) {
            return new PageResponse<>(List.of(), safePage, safeSize, 0, true);
        }

        ZoneId zone = ZoneId.systemDefault();
        Instant start = LocalDate.now(zone).atStartOfDay(zone).toInstant();
        Instant end = LocalDate.now(zone).plusDays(1).atStartOfDay(zone).toInstant();

        Page<Post> result = posts.findFeed(friendIds, start, end, pageable);
        return PageResponse.from(result.map(PostResponse::from));
    }

    @Transactional(readOnly = true)
    public PageResponse<PostResponse> userPosts(User viewer, Long userId, int page, int size) {
        boolean self = viewer.getId().equals(userId);
        if (!self && !friendships.areFriends(viewer.getId(), userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "You can only view friends' posts");
        }

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);

        Page<Post> result = posts.findByAuthorIdOrderByCreatedAtDesc(
                userId, PageRequest.of(safePage, safeSize));

        return PageResponse.from(result.map(PostResponse::from));
    }

    /* --------------------------- Comments --------------------------- */

    @Transactional(readOnly = true)
    public List<CommentResponse> comments(User viewer, Long postId) {
        Post post = findPost(postId);
        requireCanView(post, viewer);

        return comments.findByPostIdOrderByCreatedAtAsc(postId)
                .stream()
                .map(CommentResponse::from)
                .toList();
    }

    @Transactional
    public CommentResponse addComment(User current, Long postId, CommentRequest req) {
        Post post = findPost(postId);
        requireCanView(post, current);

        String content = blankToNull(req.content());
        String imageUrl = blankToNull(req.imageUrl());

        if (content == null && imageUrl == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "A comment needs text or an image");
        }

        Comment comment = Comment.builder()
                .post(post)
                .author(current)
                .content(content)
                .imageUrl(imageUrl)
                .build();

        comments.save(comment);
        return CommentResponse.from(comment);
    }

    @Transactional
    public void deleteComment(User current, Long postId, Long commentId) {
        Comment comment = comments.findById(commentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Comment not found"));

        if (!comment.getPost().getId().equals(postId)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Comment not found on this post");
        }

        boolean commentAuthor = comment.getAuthor().getId().equals(current.getId());
        boolean postAuthor = comment.getPost().getAuthor().getId().equals(current.getId());

        if (!commentAuthor && !postAuthor) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "You cannot delete this comment");
        }

        comments.delete(comment);
    }

    /* --------------------------- Helpers --------------------------- */

    private Post findPost(Long postId) {
        return posts.findById(postId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Post not found"));
    }

    private void requireAuthor(Post post, User current) {
        if (!post.getAuthor().getId().equals(current.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only edit your own posts");
        }
    }

    private void requireCanView(Post post, User viewer) {
        if (post.getAuthor().getId().equals(viewer.getId())) {
            return;
        }
        if (!friendships.areFriends(viewer.getId(), post.getAuthor().getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "You can only interact with friends' posts");
        }
    }

    private String validateFont(String font) {
        if (font == null || font.isBlank()) {
            return DEFAULT_FONT;
        }
        if (!ALLOWED_FONTS.contains(font)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported font");
        }
        return font;
    }

    private String orDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}