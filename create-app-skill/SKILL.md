# Create App Skill

Use this skill to streamline the creation of new apps using standardized tools and processes in the mastoj organization. Follow the steps to initialize the app and ensure that it conforms to project conventions.

## Purpose
This skill initializes a new app repository, ensuring alignment with organization-specific configuration and setup conventions. It supports customization of project structure, naming, and basic infrastructure.

---

## How to Use

1. **Run the Create Command**: Use `npx create-kor <AppName>` to generate a new app, replacing `<AppName>` with the app name in PascalCase.

2. **Rename the Repository and Directory**: Standardize the file name to kebab-case for consistency. For example, rename `MyApp` to `my-app`.

3. **Initialize a Git Repository**: `git init` the root of the app.

4. **Customize Metadata**: Set basic configurations like `package.json` descriptions and add the licensing files.
---