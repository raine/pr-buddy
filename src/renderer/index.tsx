import React from 'react'
import { render } from 'react-dom'
import App from './App'
import { InitData } from './renderer'

const queryString = window.location.search.substr(1)
const initData: InitData = JSON.parse(
  new URLSearchParams(queryString).get('initData')!
)

render(
  <App repositoryPath={initData.repositoryPath} />,
  document.getElementById('root')
)
