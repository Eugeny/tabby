#include <node_api.h>
#include <windows.h>
#include <DispatcherQueue.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.System.h>
#include <winrt/Windows.UI.Composition.h>
#include <winrt/Windows.UI.Composition.Desktop.h>
#include <windows.ui.composition.interop.h>
#include <cmath>
#include <cstring>
#include <map>
#include <stdexcept>

using namespace winrt;
using namespace Windows::UI::Composition;
using namespace Windows::UI::Composition::Desktop;

namespace {

struct Backdrop {
	DesktopWindowTarget target{nullptr};
	CompositionColorBrush background{nullptr};
	SpriteVisual wallpaper{nullptr};
};

struct State {
	Windows::System::DispatcherQueueController queue{nullptr};
	Compositor compositor{nullptr};
	std::map<HWND, Backdrop> backdrops;

	void initialize() {
		if (compositor) return;
		if (!Windows::System::DispatcherQueue::GetForCurrentThread()) {
			DispatcherQueueOptions options{sizeof(options), DQTYPE_THREAD_CURRENT, DQTAT_COM_NONE};
			check_hresult(CreateDispatcherQueueController(options,
				reinterpret_cast<ABI::Windows::System::IDispatcherQueueController**>(put_abi(queue))));
		}
		compositor = Compositor();
	}

	~State() {
		for (auto& [window, backdrop] : backdrops) {
			try { backdrop.target.Close(); } catch (...) { }
		}
		backdrops.clear();
		try {
			if (compositor) compositor.Close();
			if (queue) queue.ShutdownQueueAsync();
		} catch (...) { }
	}
};

HWND getWindow(napi_env env, napi_value value) {
	void* buffer = nullptr;
	size_t length = 0;
	if (napi_get_buffer_info(env, value, &buffer, &length) != napi_ok || length != sizeof(HWND)) {
		throw std::invalid_argument("Expected a native window handle buffer");
	}
	HWND window;
	std::memcpy(&window, buffer, sizeof(window));
	return window;
}

napi_value throwError(napi_env env) {
	try { throw; }
	catch (hresult_error const& error) {
		const auto message = to_string(error.message());
		napi_throw_error(env, nullptr, message.c_str());
	}
	catch (std::exception const& error) {
		napi_throw_error(env, nullptr, error.what());
	}
	return nullptr;
}

napi_value set(napi_env env, napi_callback_info info) {
	try {
		size_t count = 3;
		napi_value args[3];
		napi_get_cb_info(env, info, &count, args, nullptr, nullptr);
		if (count != 3) throw std::invalid_argument("Expected handle, opacity and background color");
		const auto window = getWindow(env, args[0]);
		DWORD process = 0;
		GetWindowThreadProcessId(window, &process);
		if (process != GetCurrentProcessId()) throw std::invalid_argument("Window must belong to this process");
		double opacity = 0;
		uint32_t rgb = 0;
		if (napi_get_value_double(env, args[1], &opacity) != napi_ok || !std::isfinite(opacity) || opacity < 0 || opacity > 1 ||
			napi_get_value_uint32(env, args[2], &rgb) != napi_ok || rgb > 0xFFFFFF) {
			throw std::invalid_argument("Invalid wallpaper opacity or background color");
		}
		State* state;
		napi_get_instance_data(env, reinterpret_cast<void**>(&state));
		state->initialize();
		auto it = state->backdrops.find(window);
		if (it == state->backdrops.end()) {
			const auto brush = state->compositor.TryCreateBlurredWallpaperBackdropBrush();
			if (!brush) {
				napi_value result;
				napi_get_boolean(env, false, &result);
				return result;
			}
			Backdrop backdrop;
			auto interop = state->compositor.as<ABI::Windows::UI::Composition::Desktop::ICompositorDesktopInterop>();
			check_hresult(interop->CreateDesktopWindowTarget(window, false,
				reinterpret_cast<ABI::Windows::UI::Composition::Desktop::IDesktopWindowTarget**>(put_abi(backdrop.target))));
			auto root = state->compositor.CreateContainerVisual();
			root.RelativeSizeAdjustment({1, 1});
			auto background = state->compositor.CreateSpriteVisual();
			background.RelativeSizeAdjustment({1, 1});
			backdrop.background = state->compositor.CreateColorBrush();
			background.Brush(backdrop.background);
			root.Children().InsertAtBottom(background);
			backdrop.wallpaper = state->compositor.CreateSpriteVisual();
			backdrop.wallpaper.RelativeSizeAdjustment({1, 1});
			backdrop.wallpaper.Brush(brush);
			root.Children().InsertAtTop(backdrop.wallpaper);
			backdrop.target.Root(root);
			it = state->backdrops.emplace(window, std::move(backdrop)).first;
		}
		// Keep the backing opaque when wallpaper opacity is zero.
		it->second.background.Color({255, static_cast<uint8_t>(rgb >> 16), static_cast<uint8_t>(rgb >> 8), static_cast<uint8_t>(rgb)});
		it->second.wallpaper.Opacity(static_cast<float>(opacity));
		napi_value result;
		napi_get_boolean(env, true, &result);
		return result;
	} catch (...) { return throwError(env); }
}

napi_value clear(napi_env env, napi_callback_info info) {
	try {
		size_t count = 1;
		napi_value args[1];
		napi_get_cb_info(env, info, &count, args, nullptr, nullptr);
		if (count != 1) throw std::invalid_argument("Expected a native window handle");
		const auto window = getWindow(env, args[0]);
		State* state;
		napi_get_instance_data(env, reinterpret_cast<void**>(&state));
		const auto it = state->backdrops.find(window);
		if (it != state->backdrops.end()) {
			it->second.target.Close();
			state->backdrops.erase(it);
		}
		napi_value result;
		napi_get_undefined(env, &result);
		return result;
	} catch (...) { return throwError(env); }
}

} // namespace

NAPI_MODULE_INIT() {
	napi_set_instance_data(env, new State(), [](napi_env, void* data, void*) { delete static_cast<State*>(data); }, nullptr);
	napi_property_descriptor functions[] = {
		{"set", nullptr, set, nullptr, nullptr, nullptr, napi_default, nullptr},
		{"clear", nullptr, clear, nullptr, nullptr, nullptr, napi_default, nullptr},
	};
	napi_define_properties(env, exports, 2, functions);
	return exports;
}
