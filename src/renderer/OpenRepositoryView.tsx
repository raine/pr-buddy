import React from 'react'

function OpenRepositoryView() {
  return (
    <div className="flex justify-center h-[100vh] items-center bg-gray-50">
      <div className="mt-[-3rem]">
        <button
          onClick={() => {
            void window.electronAPI.showOpenRepositoryDialog()
          }}
          className="px-5 hover:bg-gray-100 py-2 transition active:shadow-inner font-medium rounded-md text-2xl border shadow text-gray-600 border-gray-300 disabled:opacity-50 disabled:pointer-events-none"
        >
          Open a repository
        </button>
      </div>
    </div>
  )
}

export default React.memo(OpenRepositoryView)
