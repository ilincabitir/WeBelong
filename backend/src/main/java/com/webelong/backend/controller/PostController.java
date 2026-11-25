package com.webelong.backend.controller;

import com.webelong.backend.dto.CommentRequest;
import com.webelong.backend.dto.CommentResponse;
import com.webelong.backend.dto.PageResponse;
import com.webelong.backend.dto.PostRequest;
import com.webelong.backend.dto.PostResponse;
import com.webelong.backend.model.User;
import com.webelong.backend.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @PostMapping("/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public PostResponse create(@AuthenticationPrincipal User current,
                               @Valid @RequestBody PostRequest req) {
        return postService.create(current, req);
    }

    @PutMapping("/posts/{id}")
    public PostResponse update(@AuthenticationPrincipal User current,
                               @PathVariable Long id,
                               @Valid @RequestBody PostRequest req) {
        return postService.update(current, id, req);
    }

    @DeleteMapping("/posts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User current,
                       @PathVariable Long id) {
        postService.delete(current, id);
    }

    @GetMapping("/posts/{id}")
    public PostResponse get(@AuthenticationPrincipal User current,
                            @PathVariable Long id) {
        return postService.get(current, id);
    }

    @GetMapping("/feed")
    public PageResponse<PostResponse> feed(@AuthenticationPrincipal User current,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "10") int size) {
        return postService.feed(current, page, size);
    }

    @GetMapping("/users/{userId}/posts")
    public PageResponse<PostResponse> userPosts(@AuthenticationPrincipal User current,
                                                @PathVariable Long userId,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "10") int size) {
        return postService.userPosts(current, userId, page, size);
    }

    @GetMapping("/posts/{id}/comments")
    public List<CommentResponse> comments(@AuthenticationPrincipal User current,
                                          @PathVariable Long id) {
        return postService.comments(current, id);
    }

    @PostMapping("/posts/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse addComment(@AuthenticationPrincipal User current,
                                      @PathVariable Long id,
                                      @Valid @RequestBody CommentRequest req) {
        return postService.addComment(current, id, req);
    }

    @DeleteMapping("/posts/{postId}/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(@AuthenticationPrincipal User current,
                              @PathVariable Long postId,
                              @PathVariable Long commentId) {
        postService.deleteComment(current, postId, commentId);
    }
}