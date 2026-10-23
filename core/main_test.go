package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
)


func TestHandleDownloadSanitizesFilename(t *testing.T) {
	// Create a temporary storage directory
	tempDir, err := os.MkdirTemp("", "coneshare-test-storage")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Write a dummy file to download
	storageKey := "uploads/test-file.txt"
	fullPath := filepath.Join(tempDir, storageKey)
	err = os.MkdirAll(filepath.Dir(fullPath), 0755)
	if err != nil {
		t.Fatalf("failed to create storage dir structure: %v", err)
	}
	err = os.WriteFile(fullPath, []byte("hello world"), 0644)
	if err != nil {
		t.Fatalf("failed to write dummy file: %v", err)
	}

	config := Config{
		StoragePath: tempDir,
	}

	// Insert a token with a malicious filename containing path traversal
	token := "test-token"
	tokenStore[token] = TokenInfo{
		StorageKey: storageKey,
		Filename:   "../../etc/evil.txt",
		ExpiresAt:  time.Now().Add(1 * time.Hour),
	}

	// Set up router and recorder
	r := chi.NewRouter()
	r.Get("/files/download/{token}", handleDownload(config, "attachment"))

	req := httptest.NewRequest("GET", "/files/download/test-token", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	contentDisposition := w.Header().Get("Content-Disposition")
	expectedHeader := `attachment; filename*=UTF-8''evil.txt`
	if contentDisposition != expectedHeader {
		t.Errorf("expected Content-Disposition %q, got %q", expectedHeader, contentDisposition)
	}
}

func TestHandleDownloadBlocksPathTraversalOutsideStorageRoot(t *testing.T) {
	// Create a parent directory containing storage and a secret file outside storage
	baseDir, err := os.MkdirTemp("", "coneshare-test-base")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(baseDir)

	storageDir := filepath.Join(baseDir, "storage")
	err = os.MkdirAll(storageDir, 0755)
	if err != nil {
		t.Fatalf("failed to create storage dir: %v", err)
	}

	secretFile := filepath.Join(baseDir, "secret.txt")
	err = os.WriteFile(secretFile, []byte("super-secret-django-key"), 0644)
	if err != nil {
		t.Fatalf("failed to write secret file: %v", err)
	}

	config := Config{
		StoragePath: storageDir,
	}

	traversalKeys := []string{
		"../secret.txt",
		"../../secret.txt",
		"uploads/../../secret.txt",
	}

	for i, key := range traversalKeys {
		token := "traversal-token-" + string(rune('a'+i))
		storeLock.Lock()
		tokenStore[token] = TokenInfo{
			StorageKey: key,
			ExpiresAt:  time.Now().Add(1 * time.Hour),
		}
		storeLock.Unlock()

		r := chi.NewRouter()
		r.Get("/files/download/{token}", handleDownload(config, "attachment"))
		r.Get("/files/preview/{token}", handleDownload(config, "inline"))
		r.Get("/files/preview/{token}/*", handleDownload(config, "inline"))

		// Test /files/download/{token}
		req := httptest.NewRequest("GET", "/files/download/"+token, nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusForbidden {
			t.Errorf("key %q: expected status 403 Forbidden on download, got %d", key, w.Code)
		}

		// Test /files/preview/{token}
		reqPreview := httptest.NewRequest("GET", "/files/preview/"+token, nil)
		wPreview := httptest.NewRecorder()
		r.ServeHTTP(wPreview, reqPreview)
		if wPreview.Code != http.StatusForbidden {
			t.Errorf("key %q: expected status 403 Forbidden on preview, got %d", key, wPreview.Code)
		}
	}
}

func TestGenerateURLHandlerRejectsPathTraversal(t *testing.T) {
	handler := generateURLHandler("download", 1*time.Hour)

	invalidKeys := []string{
		"../secret.txt",
		"/etc/passwd",
		"uploads/../../secret.txt",
	}

	for _, key := range invalidKeys {
		body := `{"storage_key":"` + key + `"}`
		req := httptest.NewRequest("POST", "/internal/v1/generate-download-url", strings.NewReader(body))
		w := httptest.NewRecorder()
		handler(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("key %q: expected status 400 Bad Request on generate-url, got %d", key, w.Code)
		}
	}
}


