package com.webelong.backend.repository;

import com.webelong.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    @Query("""
        select u from User u
        where u.id <> :me
          and (lower(u.username) like :pattern
            or lower(u.displayName) like :pattern)
        order by u.displayName asc
        """)
    List<User> search(@Param("me") Long me,
                      @Param("pattern") String pattern,
                      Pageable pageable);

}
