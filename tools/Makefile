CXX ?= c++
CXXFLAGS ?= -O2 -std=c++17 -Wall -Wextra -Wno-unused-parameter

OPENCV_PKG ?= opencv4
# 确保包含 xphoto 模块
OPENCV_FLAGS := $(shell pkg-config --cflags $(OPENCV_PKG) 2>/dev/null)
OPENCV_LIBS := $(shell pkg-config --libs $(OPENCV_PKG) 2>/dev/null) -lopencv_xphoto
ifeq ($(OPENCV_FLAGS),)
  OPENCV_PKG := opencv
  OPENCV_FLAGS := $(shell pkg-config --cflags $(OPENCV_PKG) 2>/dev/null)
  OPENCV_LIBS := $(shell pkg-config --libs $(OPENCV_PKG) 2>/dev/null) -lopencv_xphoto
endif
OPENCV_FULL := $(OPENCV_FLAGS) $(OPENCV_LIBS)

LIBRAW_FLAGS := $(shell pkg-config --cflags --libs libraw 2>/dev/null)

SRC := compute_white_balance.cpp
BIN := compute_white_balance
BUILD_DIR := ../build/tools
OUT := $(BUILD_DIR)/$(BIN)

.PHONY: all clean run sample

all: $(OUT)

$(OUT): $(SRC)
	@mkdir -p $(BUILD_DIR)
ifeq ($(strip $(OPENCV_FLAGS)),)
	@echo "[error] pkg-config did not find OpenCV (tried opencv4/opencv). Please install OpenCV or set PKG_CONFIG_PATH." && exit 2
endif
ifeq ($(strip $(LIBRAW_FLAGS)),)
	@echo "[error] pkg-config did not find libraw. Please install libraw or set PKG_CONFIG_PATH." && exit 2
endif
	$(CXX) $(CXXFLAGS) $(SRC) -o $(OUT) $(OPENCV_FULL) $(LIBRAW_FLAGS)
	@echo "Built $(OUT)"

clean:
	rm -f $(OUT)

run: $(OUT)
	$(OUT) $(FILE)

sample: $(OUT)
	$(OUT) /Users/fuguoqiang/Documents/workspace/infra/librawspeed/raw-samples-repo/ARW/DSC02975.ARW


