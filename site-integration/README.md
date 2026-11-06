# suzyeaston.ca integration

Your existing website is a WordPress PHP theme in `suzyeaston/suzyeastonca`, with a manifest-controlled SSH deployment workflow. The separate project lives at GitHub Pages to isolate the map's UI, data refresh cycle and dependency surface from WordPress.

1. Create the public `suzyeaston/afterimage-vancouver` repo using `bash scripts/create-repo.sh`; enable GitHub Pages / Actions if prompted.
2. Copy `page-afterimage.php` to the theme root of `suzyeastonca` (or merge the prebuilt integration PR if available).
3. Add `page-afterimage.php` to `THEME_FILES` in `scripts/theme_deploy_manifest.py` in the parent site repo. Otherwise its manifest validation and deployment will fail.
4. Deploy the website theme via its existing workflow.
5. In WordPress Admin → Pages → Add New, create **AFTERIMAGE** with the slug `afterimage`, choose the `AFTERIMAGE / Vancouver` page template, and publish.
6. Visit `https://suzyeaston.ca/afterimage/`. You may also link the page from the Projects section once the repo is live.

This page makes *no* API calls to a private applicant database. It merely embeds the public static atlas.
