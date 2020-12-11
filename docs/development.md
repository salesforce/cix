# Contributing to CIX

## Set up your local development environment
- Install required system dependencies
	- [Install Docker on your workstation](install-docker.md)
	- Install Node.js v12
		- Using Brew
		```bash
		brew install node@12
		brew link node
		```
		- Or download the appropriate package from the [Node.js web site](https://nodejs.org/en/download/).
	- If you haven't already, [setup](https://confluence.internal.salesforce.com/pages/viewpage.action?spaceKey=NEXUS&title=Nexus+NPM+Repositories) access to the Nexus npm repositories
- Clone the CIX repo
	```bash
	git clone git@github.com:ci/cix.git && cd cix
	```
- Setup the CIX development environment
	```bash
	npm install
	```

## Optionally install Microsoft Visual Studio Code
- You can download the latest version of Code from [here](https://code.visualstudio.com/).
- Some recommended extensions
  - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
  - [YAML](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml)

## Running CIX from source
Once you have built the CIX application, run it locally using `./cix`:

1. `cd ~/ci/cix`
2. `./cix exec -y docs/examples/basic.yaml`

## Running Tests
### Unit tests
CIX uses [Jest](https://jestjs.io/) for unit testing. To run the tests locally, just run the following npm script:
```bash
npm run test
```

### CLI Integration Tests
CIX uses [Bats](https://github.com/bats-core/bats-core) to test the CLI and provide some end-to-end testing. To run these tests, which are located in the [`integration`](https://github.com/salesforce/cix/tree/master/integration) subdirectory, run the following from the root of the project:

!> These tests will take some time as they execute real pipelines.

!> The tests use the local Docker image tagged 'alpha' or as overridden by the CIX_IMAGE environment variable, so ensure yours reflects the image you intend to test.

```bash
npm run itest
```


## Other development tasks
- Cleaning the project (will need to run npm install after)
```bash
npm run clean
```
- Before adding any dependencies, ensure a local .npmrc file does not exist
```bash
rm .npmrc # user's .npmrc should be set in home
```
- Adding dependencies to root package
```bash
npm add <package>[@version] # optionally, add '--save-dev' for dev specific packages
```

## Building the docker image and testing locally
- Get the latest code and install dependencies
```bash
$ git pull
$ npm install
```
- Build the docker image locally
	- Generate a GIT_TOKEN here: https://github.com/settings/tokens
	- Find your NPM_TOKEN using: `grep _authToken ~/.npmrc | head -1 | cut -d\" -f2`
	- DOCKER Creds can be your Aloha username/password
	```bash
	cix exec -y build/cix.yaml -s GIT_TOKEN="****" -s NPM_TOKEN="****" -e DOCKER_USER=username -s DOCKER_PASSWORD='******'
	```
- Configure CIX to use your local image, install and test
	```bash
	export CIX_IMAGE=salesforce/cix:alpha
	docker run --rm salesforce/cix:alpha install | sudo sh
	cix exec -y docs/examples/basic.yaml
	```

## Performing a SonarQube analysis locally
Performing a branch analysis locally with SonarQube enables visibility into the impact of code changes on the project quality prior to creating a formal pull request. The branch analysis will **only** capture changes thus far committed to git. Pushing is not required.
- Change some code
- Commit changes to git
- Perform a cix build with the addition of the BRANCH_NAME environment property
	```bash
	cix exec -y cix-build.yaml -s GIT_TOKEN="****" -s NPM_TOKEN="****" -e DOCKER_USER=username -s DOCKER_PASSWORD='******' -e BRANCH_NAME=`git rev-parse --abbrev-ref HEAD`
	```
A link to the resulting analysis will be printed in the build output.

## Contributing to the Docs
- Start the doc preview server:
```bash
npm run preview-docs
```
-  \_sidebar.md files are nested and control the sidebar layout using markdown.
- For available markdown, check out this page: [docsify-themeable markdown](https://jhildenbiddle.github.io/docsify-themeable/#/markdown)
- The shared folder is for markdown that needs to be embedded on more than one page. To embed a page, use this. Note the path is relative.
```markdown
[Error loading section, please refresh](../shared/yaml-syntax.md ':include')
```
- You can embed YAML examples from the examples directory:
```markdown
[Error loading section, please refresh](../examples/basic.yaml ':include :type=code')
```
- For language syntax highlighting, be sure to add the type:
```markdown
```bash
```markdown
```yaml
```
- For more on Docsify and its plugins, checkout this page: [Docsify Homepage](https://docsify.js.org/#/)

## Code Style
?> This is a work in progress

### Conventions Not Enforced by ESLint
- Always heed eslint suggestions, as we enforce many of our coding standards via eslint. Do not disable specific warnings or files unless absolutely necessary. For example: `/* eslint-disable */` should only be used sparingly.
- Prefer templated string substitution over string concatenation.
  - For example:
	```javascript
	console.log(`Name: ${name}`); // preferred
	console.log('Name: ' + name); // should be avoided
	```
- Object Oriented Programming notes
  - Use ES6 classes wherever it makes sense to do so (e.g. if you're doing more than just exporting a function)
	- Classes providing OO patterns should include that pattern in the class name (e.g. ObjectProvider, PipelineFactory, etc.)
- Prefer lodash and lodash mixins over builtins when a concise and clear solution is provided (see [lodash docs](https://lodash.com/docs/4.17.15) and [lodash.js](https://github.com/salesforce/cix/blob/master/packages/cix-common/src/lodash.js) for mixins)
  - For example:
  ```javascript
  const copy = _.cloneDeep(original); // preferred
  const copy = Object.assign({}, original); // should be avoided
  ```
  - Another example:
  ```javascript
	const arr = ['one', 'two', 'three'];
	_.each(arr, elem => console.log(elem)); // preferred
	arr.forEach(elem => console.log(elem)); // should be avoided
  ```

### Enforced by ESLint
Current ESLint configuration can be found in [.eslinrc.json](https://github.com/salesforce/cix/blob/master/.eslintrc.json). It currently extends [Google's ESLint](https://github.com/google/eslint-config-google) and [JSDoc Recommended](https://github.com/gajus/eslint-plugin-jsdoc). **Note:** please reference [.eslintrc.json](https://github.com/salesforce/cix/blob/master/.eslintrc.json) for the most up-to-date representation of code style rules.
- indentations must be 2 spaces, tabs and other whitespace characters are not allowed
- single quotes `'` must be used over double quotes `"`
- `const` must be used if a variable is not reassigned
- prefer `let` over `var` when defining variables which will be reassigned
- variables defined must be used
- All files must be padded by a blank line at the end
- JSDoc is required
- Imports must be sorted following the `sort-imports` ESLint rule.
