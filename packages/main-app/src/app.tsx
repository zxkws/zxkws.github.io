import PageLoading from './components/PageLoading';
// import FrameworkLayout from '@/layouts/FrameworkLayout';
import { AuthProvider } from './context/AuthContext';
import './index.css';

import './global.scss';


// import styled from 'styled-components';

// const Button = styled.button`
//   background-color: #3498db;
//   color: white;
//   padding: 10px 20px;
//   font-size: 16px;
//   border-radius: 5px;
//   border: none;

//   &:hover {
//     background-color: #2980b9;
//   }
// `;

import BasicLayout from './layouts/BasicLayout';
import ReactDom from 'react-dom/client';
// import { registerMicroApps, start } from 'micro-lib';

// const apps = [
//   {
//     name: 'curlconverter',
//     activePath: '/curlconverter',
//     title: 'curlconverter',
//     iframe: 'https://curlconverter.com/',
//   },
// ];

// registerMicroApps(apps);

function App() {
  return (
    <AuthProvider>
      <BasicLayout>
        <PageLoading />
      </BasicLayout>
    </AuthProvider>
  );
}

// start({
//   onAppEnter: () => {},
//   onAppLeave: () => {},
//   onLoadingApp: () => {},
//   onFinishLoading: () => {},
// });
const root = document.getElementById('main-app-container')
if(root) {
  ReactDom.createRoot(root).render(<App />);
}
