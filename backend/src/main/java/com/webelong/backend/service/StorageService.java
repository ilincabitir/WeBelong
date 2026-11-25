package com.webelong.backend.service;

import com.webelong.backend.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class StorageService {

    private static final long MAX_BYTES = 5L * 1024 * 1024;

    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/png", ".png",
            "image/jpeg", ".jpg",
            "image/webp", ".webp",
            "image/gif", ".gif"
    );

    private final Path root;

    public StorageService(@Value("${app.uploads.dir:uploads}") String directory) {
        this.root = Path.of(directory).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create upload directory: " + root, e);
        }
    }

    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File is empty");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "File exceeds the 5 MB limit");
        }

        String contentType = file.getContentType();
        String extension = contentType == null
                ? null
                : EXTENSIONS.get(contentType.toLowerCase(Locale.ROOT));

        if (extension == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Only PNG, JPEG, WEBP or GIF images are allowed");
        }

        String filename = UUID.randomUUID() + extension;

        try {
            Files.copy(
                    file.getInputStream(),
                    root.resolve(filename),
                    StandardCopyOption.REPLACE_EXISTING
            );
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not store the file");
        }

        return "/api/files/" + filename;
    }

    /** Absolute file: URI of the upload directory, with a trailing slash. */
    public String rootLocation() {
        String location = root.toUri().toString();
        return location.endsWith("/") ? location : location + "/";
    }
}