import './index.css'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from "react-router-dom";
import AuthProvider from './components/AuthProvider';
import router from "./router";
import {App as AntdApp} from "antd";
import { Provider } from 'react-redux';
import { store } from './stores';

ReactDOM.createRoot(document.getElementById('root')!)
.render(
  <AntdApp>
    <Provider store={store}>
      <AuthProvider>
        <RouterProvider router={router}/>
      </AuthProvider>
    </Provider>
  </AntdApp>
)