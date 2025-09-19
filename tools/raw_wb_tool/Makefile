# Makefile for white point based white balance tool

CXX = g++
CXXFLAGS = -std=c++17 -O3 -Wall -Wextra -I../ `pkg-config --cflags libraw`
LDFLAGS = `pkg-config --libs libraw` `pkg-config --libs opencv4` -llcms2
OPENCV_FLAGS = `pkg-config --cflags opencv4`

# Directories
BUILD_DIR = build

# Targets
TARGET = $(BUILD_DIR)/raw_wb_whitepoint
INSPECT = $(BUILD_DIR)/inspect_whitepoint

# Object files
OBJS = $(BUILD_DIR)/color_temperature.o

# Build rules
all: $(BUILD_DIR) $(TARGET) $(INSPECT)

$(BUILD_DIR):
	@mkdir -p $(BUILD_DIR)

# Color temperature library object
$(BUILD_DIR)/color_temperature.o: color_temperature.cpp color_temperature.h
	$(CXX) $(CXXFLAGS) -c -o $@ $<

# Main target
$(TARGET): raw_wb_whitepoint.cpp $(OBJS) color_temperature.h
	$(CXX) $(CXXFLAGS) $(OPENCV_FLAGS) -o $@ raw_wb_whitepoint.cpp $(OBJS) $(LDFLAGS)

# Inspect-only tool (no OpenCV needed)
$(INSPECT): inspect_whitepoint.cpp $(OBJS) color_temperature.h
	$(CXX) $(CXXFLAGS) -o $@ inspect_whitepoint.cpp $(OBJS) `pkg-config --libs libraw` -llcms2

clean:
	rm -rf $(BUILD_DIR)

.PHONY: all clean