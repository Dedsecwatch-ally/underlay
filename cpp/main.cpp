#include <napi.h>
#include "engine_core.h"

// Keep the legacy hello world for verification if desired, or remove.
Napi::String GetMessage(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, "Hello from C++!");
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "getMessage"), Napi::Function::New(env, GetMessage));
  
  // Initialize EngineCore class
  EngineCore::Init(env, exports);
  
  return exports;
}

NODE_API_MODULE(addon, Init)
