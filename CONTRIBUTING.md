# Contributing to LibRaw Node.js

Thank you for your interest in contributing to LibRaw Node.js! This document provides guidelines for contributing to the project.

## Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/pixFlowTeam/librawspeed.git
   cd librawspeed
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Build the Project**

   ```bash
   npm run build
   ```

4. **Run Tests**
   ```bash
   npm run test:quick
   ```

## Development Guidelines

### Code Style

- Use consistent indentation (2 spaces)
- Follow existing naming conventions
- Add comments for complex logic
- Keep functions focused and small

### C++ Guidelines

- Use RAII for resource management
- Handle all LibRaw error codes
- Provide meaningful error messages
- Clean up resources in destructors

### JavaScript Guidelines

- Use modern async/await syntax
- Provide comprehensive error handling
- Write clear, self-documenting code
- Add JSDoc comments for public APIs

## Testing

### Adding Tests

- Add unit tests for new features
- Test error conditions
- Include integration tests with sample files
- Verify memory cleanup

### Running Tests

```bash
npm run test:quick    # Basic functionality
npm run test:samples  # Sample file processing
npm run test:compare  # Comparison analysis
npm test path/to/raw  # Custom file test
```

## Submitting Changes

1. **Create a Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**

   - Write code following the guidelines
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**

   ```bash
   npm run build
   npm run test:quick
   ```

4. **Commit Your Changes**

   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Commit Message Format

Use conventional commits format:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `test:` test additions or modifications
- `refactor:` code refactoring
- `perf:` performance improvements

## Areas for Contribution

### High Priority

- Cross-platform build support (macOS, Linux)
- Asynchronous processing with worker threads
- Image processing and export capabilities
- TypeScript definitions

### Medium Priority

- Additional metadata extraction
- Performance optimizations
- Better error handling
- Documentation improvements

### Low Priority

- Advanced color management
- Batch processing features
- Plugin system
- Additional export formats

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues before creating new ones

Thank you for contributing!
