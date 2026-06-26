# GitHub Actions Setup

## Release Please Configuration

The release-please workflow requires proper permissions to create pull requests. There are two ways to fix the permission error:

### Option 1: Enable Workflow Permissions (Recommended)

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Actions** → **General**
3. Scroll down to **Workflow permissions**
4. Select **"Read and write permissions"**
5. Check **"Allow GitHub Actions to create and approve pull requests"**
6. Click **Save**

### Option 2: Use a Personal Access Token

If you prefer more control or Option 1 doesn't work:

1. Create a Personal Access Token:

   - Go to https://github.com/settings/tokens/new?scopes=repo
   - Name it: `RELEASE_PLEASE_TOKEN`
   - Select scope: `repo` (Full control of private repositories)
   - Set expiration as needed
   - Click **Generate token**
   - Copy the token immediately (you won't see it again)

2. Add the token to your repository:

   - Go to your repository **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `RELEASE_PLEASE_TOKEN`
   - Value: Paste the token you copied
   - Click **Add secret**

3. The workflow is already configured to use this token as a fallback

## Updated Action

The workflow has been updated to use the maintained `googleapis/release-please-action@v4` instead of the deprecated `google-github-actions/release-please-action@v4`.

## Node Version

GitHub Actions now uses Node 24 by default. If you need to temporarily use Node 20, set the `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true` environment variable (not recommended for security reasons).
