package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
)

const ollamaURL = "http://localhost:11434/api/generate"
const ollamaModelsURL = "http://localhost:11434/api/tags"

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next(w, r)
	}
}

func proxyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST allowed", http.StatusMethodNotAllowed)
		return
	}

	// Forward request body to Ollama
	resp, err := http.Post(ollamaURL, "application/json", r.Body)
	if err != nil {
		http.Error(w, fmt.Sprintf("Ollama unreachable: %v", err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy response headers and body
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func modelsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Only GET allowed", http.StatusMethodNotAllowed)
		return
	}

	// Fetch available models from Ollama
	resp, err := http.Get(ollamaModelsURL)
	if err != nil {
		http.Error(w, fmt.Sprintf("Ollama unreachable: %v", err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy response headers and body
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/ollama", corsMiddleware(proxyHandler))
	mux.HandleFunc("/models", corsMiddleware(modelsHandler))

	addr := ":8080"
	fmt.Printf("🔄 CORS Proxy started on http://localhost%s\n", addr)
	fmt.Println("   Forwards /ollama → http://localhost:11434/api/generate")
	fmt.Println("   Forwards /models → http://localhost:11434/api/tags")
	fmt.Println("   Stop with Ctrl+C")

	log.Fatal(http.ListenAndServe(addr, mux))
}
