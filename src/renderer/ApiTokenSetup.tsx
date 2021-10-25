import React from 'react'
import { useQueryClient } from 'react-query'
import { useHistory } from 'react-router-dom'

type ApiTokenSetupProps = {
  remoteRepoPath: string
  repositoryPath: string
  repositoryHost: string
}

function ApiTokenSetup({
  remoteRepoPath,
  repositoryPath,
  repositoryHost
}: ApiTokenSetupProps) {
  const history = useHistory()
  const queryClient = useQueryClient()
  const newTokenGithubUrl = `https://${repositoryHost}/settings/tokens/new`

  return (
    <div className="w-5/6 mx-auto m-10">
      <h1 className="text-2xl text-gray-800">
        Set up a GitHub API token for{' '}
        <span className="font-medium whitespace-nowrap">{remoteRepoPath}</span>
      </h1>
      <div className="mt-4 text-gray-800">
        <div className="font-medium mb-3">1. Create an API token</div>
        PR Buddy requires a personal access token{' '}
        <span className="font-medium">with the scope "repo"</span> for
        retrieving your open pull requests from GitHub.
        <div className="mt-2">
          You can create one at:{' '}
          <a className="text-sky-700" target="_blank" href={newTokenGithubUrl}>
            {newTokenGithubUrl}
          </a>
        </div>
        <div className="font-medium mt-4 mb-3">
          2. Edit <span className="font-mono">.git/config</span>
        </div>
        Append a section like the following to{' '}
        <span className="font-mono select-text">
          {repositoryPath}/.git/config
        </span>
        , while replacing <span className="font-mono">{`<TOKEN>`}</span> with
        the API token.
        <pre className="font-mono text-sm text-gray-600 bg-gray-50 p-1 rounded mt-4 select-text">
          {`[pr-buddy]\n\tgithub-api-token = <TOKEN>`}
        </pre>
        <div className="mt-4 text-right">
          <button
            onClick={() => {
              // To reset the "isFetched" state in query so that "Loading"
              // is shown again.
              void queryClient.resetQueries('pull-requests')
              history.push('/')
            }}
            className="px-5 bg-gray-50 hover:bg-gray-100 py-2 transition active:shadow-inner font-medium rounded-md text-normal border shadow-sm text-gray-600 border-gray-300 disabled:opacity-50 disabled:pointer-events-none"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

export default React.memo(ApiTokenSetup)
