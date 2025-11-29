# ProFullStack Modules

[![Crypto Payment](https://paybadge.profullstack.com/badge.svg)](https://paybadge.profullstack.com/?tickers=btc%2Ceth%2Csol%2Cusdc)

This repository contains modular components extracted from the ProFullStack boilerplate application. These modules can be used independently in other projects.

## Available Modules

- **Document Converters** (`@profullstack/document-converters`): A unified API for converting between different document formats.
- **API Key Manager** (`@profullstack/api-key-manager`): A flexible API key management system.
- **Enhanced Router** (`@profullstack/enhanced-router`): A client-side router with advanced features.
- **WebSocket Client** (`@profullstack/websocket-client`): A robust WebSocket client with connection management.
- **Storage Service** (`@profullstack/storage-service`): A flexible storage service abstraction.
- **State Manager** (`@profullstack/state-manager`): An enhanced state manager with web component integration.
- **Payment Gateway** (`@profullstack/payment-gateway`): A unified payment gateway abstraction.

## Module Management Script

The `publish-modules.sh` script provides a comprehensive set of tools for managing and publishing the modules.

### Prerequisites

- Node.js and npm/pnpm/yarn installed
- npm account with access to the @profullstack organization (for publishing)

### Basic Usage

```bash
# List all available modules
./publish-modules.sh --all list

# Build all modules
./publish-modules.sh --all build

# Link all modules for local development
./publish-modules.sh --all link

# Publish all modules to npm
./publish-modules.sh --all publish

# Bump the version of a specific module
./publish-modules.sh -m document-converters -b minor version
```

### Script Options

```
Actions:
  publish    Publish modules to npm registry
  version    Bump version of modules
  link       Create symlinks for local development
  unlink     Remove symlinks created by link action
  build      Build modules
  test       Run tests for modules
  list       List available modules

Options:
  -h, --help                 Show this help message
  -a, --all                  Apply action to all modules
  -m, --module <name>        Apply action to specific module
  -b, --bump <level>         Version bump level (patch, minor, major) [default: patch]
  -d, --dir <path>           Directory containing modules [default: ../]
  -r, --registry <url>       NPM registry URL [default: https://registry.npmjs.org/]
  -p, --package-manager <name> Package manager to use (npm, pnpm, yarn) [default: pnpm]
  --dry-run                  Show what would be done without making changes
  --skip-build               Skip build step before publishing
  --skip-test                Skip test step before publishing
  --skip-confirm             Skip confirmation prompts
  --scope <scope>            Module scope [default: @profullstack]
```

### Examples

#### Publishing Modules

```bash
# Publish all modules
./publish-modules.sh --all publish

# Publish a specific module
./publish-modules.sh -m document-converters publish

# Dry run to see what would be published without actually publishing
./publish-modules.sh --all --dry-run publish

# Publish to a different registry
./publish-modules.sh --all -r https://npm.pkg.github.com/ publish
```

#### Version Management

```bash
# Bump patch version of all modules
./publish-modules.sh --all -b patch version

# Bump minor version of a specific module
./publish-modules.sh -m state-manager -b minor version

# Bump major version of multiple modules
./publish-modules.sh -m document-converters -m api-key-manager -b major version
```

#### Local Development

```bash
# Link all modules for local development
./publish-modules.sh --all link

# Link a specific module
./publish-modules.sh -m enhanced-router link

# Unlink all modules
./publish-modules.sh --all unlink
```

#### Building and Testing

```bash
# Build all modules
./publish-modules.sh --all build

# Test all modules
./publish-modules.sh --all test

# Build a specific module
./publish-modules.sh -m payment-gateway build
```

### Using a Different Package Manager

```bash
# Use npm instead of pnpm
./publish-modules.sh --all -p npm publish

# Use yarn
./publish-modules.sh --all -p yarn publish
```

## Using the Modules in Your Project

### Installation

```bash
# Install a specific module
npm install @profullstack/document-converters

# Install multiple modules
npm install @profullstack/enhanced-router @profullstack/state-manager
```

### Local Development

For local development, you can link the modules to your project:

```bash
# Link all modules
./publish-modules.sh --all link

# In your project directory
npm link @profullstack/document-converters @profullstack/state-manager
```

## Contributing

1. Clone the repository
2. Make your changes
3. Build and test the modules
4. Submit a pull request

## License

MIT