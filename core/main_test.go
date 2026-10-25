package main

import (
	"errors"
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

func TestGetFileInfoHandler(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "coneshare-test-fileinfo")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	storageKey := "org123/sub/sample.pdf"
	fullPath := filepath.Join(tempDir, storageKey)
	err = os.MkdirAll(filepath.Dir(fullPath), 0755)
	if err != nil {
		t.Fatalf("failed to create dirs: %v", err)
	}
	content := []byte("this is a sample 35-byte file content")
	err = os.WriteFile(fullPath, content, 0644)
	if err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	config := Config{
		StoragePath: tempDir,
	}
	handler := getFileInfoHandler(config)

	// 1. Existing file test
	body := `{"storage_key":"` + storageKey + `"}`
	req := httptest.NewRequest("POST", "/internal/v1/file-info", strings.NewReader(body))
	w := httptest.NewRecorder()
	handler(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", w.Code)
	}
	expectedJSON := `{"exists":true,"size":37}`
	trimmedBody := strings.TrimSpace(w.Body.String())
	if trimmedBody != expectedJSON {
		t.Errorf("expected %s, got %s", expectedJSON, trimmedBody)
	}

	// 2. Non-existent file test
	missingBody := `{"storage_key":"org123/missing.pdf"}`
	reqMissing := httptest.NewRequest("POST", "/internal/v1/file-info", strings.NewReader(missingBody))
	wMissing := httptest.NewRecorder()
	handler(wMissing, reqMissing)

	if wMissing.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for missing file, got %d", wMissing.Code)
	}
	expectedMissingJSON := `{"exists":false,"size":0}`
	if strings.TrimSpace(wMissing.Body.String()) != expectedMissingJSON {
		t.Errorf("expected %s, got %s", expectedMissingJSON, strings.TrimSpace(wMissing.Body.String()))
	}

	// 3. Relative path boundary test
	traversalBody := `{"storage_key":"../../etc/passwd"}`
	reqTraversal := httptest.NewRequest("POST", "/internal/v1/file-info", strings.NewReader(traversalBody))
	wTraversal := httptest.NewRecorder()
	handler(wTraversal, reqTraversal)

	if wTraversal.Code != http.StatusForbidden {
		t.Errorf("expected 403 Forbidden for path outside root, got %d", wTraversal.Code)
	}
}

type failingReader struct {
	data   []byte
	offset int
}

func (r *failingReader) Read(p []byte) (n int, err error) {
	if r.offset < len(r.data) {
		p[0] = r.data[r.offset]
		r.offset++
		return 1, nil
	}
	return 0, errors.New("simulated network connection drop")
}

func TestHandleUploadAtomicRenameAndCleanup(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "coneshare-test-upload-atomic")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	config := Config{
		StoragePath: tempDir,
	}

	r := chi.NewRouter()
	r.Put("/files/upload/{token}", handleUpload(config))

	// 1. Successful upload test
	storageKeySuccess := "org123/docs/complete.pdf"
	tokenSuccess := "token-success-atomic"
	storeLock.Lock()
	tokenStore[tokenSuccess] = TokenInfo{
		StorageKey: storageKeySuccess,
		ExpiresAt:  time.Now().Add(1 * time.Hour),
	}
	storeLock.Unlock()

	payload := "complete upload file content payload"
	reqSuccess := httptest.NewRequest("PUT", "/files/upload/"+tokenSuccess, strings.NewReader(payload))
	wSuccess := httptest.NewRecorder()
	r.ServeHTTP(wSuccess, reqSuccess)

	if wSuccess.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", wSuccess.Code)
	}

	finalPath := filepath.Join(tempDir, storageKeySuccess)
	data, err := os.ReadFile(finalPath)
	if err != nil {
		t.Fatalf("expected final file to exist: %v", err)
	}
	if string(data) != payload {
		t.Fatalf("expected file content %q, got %q", payload, string(data))
	}

	// Verify no temporary .part- files remain
	entries, err := os.ReadDir(filepath.Dir(finalPath))
	if err != nil {
		t.Fatalf("failed to read storage dir: %v", err)
	}
	for _, entry := range entries {
		if strings.Contains(entry.Name(), ".part-") {
			t.Errorf("expected no leftover .part- files, found: %s", entry.Name())
		}
	}

	// 2. Interrupted/failing upload test
	storageKeyFail := "org123/docs/aborted.pdf"
	tokenFail := "token-fail-atomic"
	storeLock.Lock()
	tokenStore[tokenFail] = TokenInfo{
		StorageKey: storageKeyFail,
		ExpiresAt:  time.Now().Add(1 * time.Hour),
	}
	storeLock.Unlock()

	reqFail := httptest.NewRequest("PUT", "/files/upload/"+tokenFail, &failingReader{data: []byte("partial")})
	wFail := httptest.NewRecorder()
	r.ServeHTTP(wFail, reqFail)

	if wFail.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500 InternalServerError, got %d", wFail.Code)
	}

	// Verify target file was NOT created
	failFinalPath := filepath.Join(tempDir, storageKeyFail)
	if _, err := os.Stat(failFinalPath); !os.IsNotExist(err) {
		t.Fatalf("aborted upload file should not exist at final path")
	}

	// Verify temporary .part- file was cleaned up
	failDirEntries, err := os.ReadDir(filepath.Dir(failFinalPath))
	if err == nil {
		for _, entry := range failDirEntries {
			if strings.Contains(entry.Name(), ".part-") {
				t.Errorf("expected temp part file to be removed on error, found: %s", entry.Name())
			}
		}
	}
}



