{
  "targets": [
    {
      "target_name": "libraw_addon",
      "sources": [
        "src/addon.cpp",
        "src/libraw_wrapper.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "deps/LibRaw-Source/LibRaw-0.21.4/include",
        "deps/LibRaw-Source/LibRaw-0.21.4/build/win32/include",
        "deps/LibRaw-Source/LibRaw-0.21.4/build/darwin-x64/include",
        "deps/LibRaw-Source/LibRaw-0.21.4/build/darwin-arm64/include",
        "deps/LibRaw-Source/LibRaw-0.21.4/build/linux-x64/include",
        "deps/LibRaw-Source/LibRaw-0.21.4/build/linux-arm64/include"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "LIBRAW_NO_MEMPOOL_CHECK"
      ],
      "conditions": [
        ["OS=='win'", {
          "libraries": [
            "<(module_root_dir)/deps/LibRaw-Source/LibRaw-0.21.4/build/win32/lib/libraw.a"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "RuntimeLibrary": 2
            }
          },
          "copies": [
            {
              "destination": "<(module_root_dir)/build/Release/",
              "files": [
                "<(module_root_dir)/deps/LibRaw-Source/LibRaw-0.21.4/bin/libraw.dll"
              ]
            }
          ]
        }],
        ["OS=='mac'", {
          "conditions": [
            ["target_arch=='arm64'", {
              "libraries": [
                "<(module_root_dir)/deps/LibRaw-Source/LibRaw-0.21.4/build/darwin-arm64/lib/libraw.a"
              ]
            }, {
              "libraries": [
                "<(module_root_dir)/deps/LibRaw-Source/LibRaw-0.21.4/build/darwin-x64/lib/libraw.a"
              ]
            }]
          ]
        }],
        ["OS=='linux'", {
          "conditions": [
            ["target_arch=='arm64'", {
              "libraries": [
                "<(module_root_dir)/deps/LibRaw-Source/LibRaw-0.21.4/build/linux-arm64/lib/libraw.a"
              ]
            }, {
              "libraries": [
                "<(module_root_dir)/deps/LibRaw-Source/LibRaw-0.21.4/build/linux-x64/lib/libraw.a"
              ]
            }]
          ]
        }]
      ]
    }
  ]
}
