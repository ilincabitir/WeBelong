package com.webelong.backend.repository;

import com.webelong.backend.model.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {

    @EntityGraph(attributePaths = "author")
    @Query("""
            select p from Post p
            where p.author.id in :authorIds
              and p.createdAt >= :start
              and p.createdAt < :end
            order by p.createdAt desc
            """)
    Page<Post> findFeed(@Param("authorIds") Collection<Long> authorIds,
                        @Param("start") Instant start,
                        @Param("end") Instant end,
                        Pageable pageable);

    @EntityGraph(attributePaths = "author")
    Page<Post> findByAuthorIdOrderByCreatedAtDesc(Long authorId, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = "author")
    Optional<Post> findById(Long id);
}