#pragma once

#include <string>
#include <vector>
#include <mutex>

class UrlFilter {
public:
    UrlFilter();
    ~UrlFilter();

    void AddPattern(const std::string& pattern);
    bool ShouldBlock(const std::string& url);
    void Clear();

private:
    std::vector<std::string> patterns;
    std::mutex filterMutex;
};
