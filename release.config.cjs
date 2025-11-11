module.exports = {
	branches: ['master', 'main'],
	repositoryUrl: 'https://github.com/framersai/openstrand-sdk',
	plugins: [
		[
			'@semantic-release/commit-analyzer',
			{
				preset: 'conventionalcommits',
				releaseRules: [
					{ type: 'docs', release: false },
					{ type: 'chore', release: false },
					{ type: 'refactor', release: 'patch' },
					{ type: 'ci', release: false },
					{ type: 'perf', release: 'patch' }
				],
			},
		],
		[
			'@semantic-release/release-notes-generator',
			{
				preset: 'conventionalcommits',
			},
		],
		[
			'@semantic-release/changelog',
			{
				changelogFile: 'CHANGELOG.md',
			},
		],
		[
			'@semantic-release/npm',
			{
				npmPublish: true,
			},
		],
		[
			'@semantic-release/github',
			{
				assets: [],
			},
		],
		[
			'@semantic-release/git',
			{
				assets: ['CHANGELOG.md', 'package.json'],
				message:
					'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
			},
		],
	],
};

