# Makefile for white point based white balance tool

CXX = g++
CXXFLAGS = -std=c++17 -O3 -Wall -Wextra -I../ `pkg-config --cflags libraw`
LDFLAGS = `pkg-config --libs libraw` `pkg-config --libs opencv4` -llcms2
OPENCV_FLAGS = `pkg-config --cflags opencv4`

# Directories
BUILD_DIR = build

# Target
TARGET = $(BUILD_DIR)/raw_wb_whitepoint

# Object files
OBJS = $(BUILD_DIR)/color_temperature.o

# Build rules
all: $(BUILD_DIR) $(TARGET)

$(BUILD_DIR):
	@mkdir -p $(BUILD_DIR)

# Color temperature library object
$(BUILD_DIR)/color_temperature.o: color_temperature.cpp color_temperature.h
	$(CXX) $(CXXFLAGS) -c -o $@ $<

# Main target
$(TARGET): raw_wb_whitepoint.cpp $(OBJS) color_temperature.h
	$(CXX) $(CXXFLAGS) $(OPENCV_FLAGS) -o $@ raw_wb_whitepoint.cpp $(OBJS) $(LDFLAGS)

clean:
	rm -rf $(BUILD_DIR)

.PHONY: all clean