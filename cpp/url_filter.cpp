#include "url_filter.h"
#include <algorithm>

UrlFilter::UrlFilter() {}

UrlFilter::~UrlFilter() {}

void UrlFilter::AddPattern(const std::string& pattern) {
    std::lock_guard<std::mutex> lock(filterMutex);
    patterns.push_back(pattern);
}

bool UrlFilter::ShouldBlock(const std::string& url) {
    std::lock_guard<std::mutex> lock(filterMutex);
    // Simple substring match for now. Optimized Aho-Corasick or similar would be better for production.
    for (const auto& pattern : patterns) {
        if (url.find(pattern) != std::string::npos) {
            return true;
        }
    }
    return false;
}

void UrlFilter::Clear() {
    std::lock_guard<std::mutex> lock(filterMutex);
    patterns.clear();
}
