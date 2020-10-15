import React from 'react'
import ReactDOMServer from 'react-dom/server'
import express from 'express';
import { StaticRouter } from 'react-router-dom'
import App from './App'
import path from 'path';
import fs from 'fs';
import { createStore, applyMiddleware } from 'redux'
import { Provider } from 'react-redux'
import thunk from 'redux-thunk'
import rootReducer from './modules'
import PreloadContext from './lib/PreloadContext'


// asset-manifest.json 에서 파일 경로들을 조회.
const manifest = JSON.parse(
  fs.readFileSync(path.resolve('./build/asset-manifest.json'), 'utf8')
)

const chunks = Object.keys(manifest.files)
  .filter(key => /chunk\.js$/.exec(key)) //chunk.js 로 끝나는 키를 찾아서
  .map(key => `<script src="${manifest.files[key]}"></script>`)//스크립트 태그로 변환
  .join('');//합침

function createPage(root, stateScript){
  
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8"/>
    <link rel="shortcut icon" href="/favicon.ico" />
    <meta 
      name="viewport" 
      content="width=device-width, initial-scale=1.0, shrink-to-fit=no"
    />
    <meta http-equiv="X-UA-Compatible" content="ie=edge"/>
    <meta name="theme-color" content="#000000" />
    <title>React App</title>
    <link href="${manifest.files['main.css']}" rel="stylesheet" />
  </head>
  <body>
    <noscript>You need to enable Javas~~~~</noscript>
    <div id="root">
      ${root}
    </div>
    ${stateScript}
    <script src="${manifest.files['runtime-main.js']}"></script>
    ${chunks}
    <script src="${manifest.files['main.js']}"></script>
  </body>
  </html>
  `;
}
const app = express();

// 서버사이드 렌더링 처리 핸들러 함수
const serverRender = async (req, res, next) =>{
  //404가 떠야하는 상황에 띄우지 않고 서버사이드 렌더링을 해줌.

  const context = {};
  const store = createStore(rootReducer, applyMiddleware(thunk))

  const preloadContext = {
    done:false,
    promises: []
  };
  
  const jsx = (
    <PreloadContext.Provider value={preloadContext}>
      <Provider store={store}>
        <StaticRouter location={req.url} context={context}>
          <App />
        </StaticRouter>
      </Provider>
    </PreloadContext.Provider>
  );

  ReactDOMServer.renderToStaticMarkup(jsx); // renderToStaticMarkup으로 한번에 렌더링
  try {
    await Promise.all(preloadContext.promises)
  } catch (e) {
    return res.status(500);
  }
  preloadContext.done = true;

  const root = ReactDOMServer.renderToString(jsx);//렌더링
  // JSON을 문자열로 변환하고 악성 스크립트가 실행되는 것을 방지하기 위해 < 를 치환처리
  const stateString = JSON.stringify(store.getState()).replace(/</g, '\\u003c');
  const stateScript = `<script>window.__PRELOADED_STATE__ = ${stateString}</script>`
  //리덕스 초기 상태를 스크립트로 주입


  res.send(createPage(root, stateScript)) //결과물
};

const serve = express.static(path.resolve('./build'),{
  index: false // "/"경로에서 index.html을 보여주지 않도록 하는 설정
})

app.use(serve) //순서가 중요. serverRender 전에 위치해야 함.
app.use(serverRender);

app.listen(5000, () =>{
  console.log('Running on http://localhost:5000')
})