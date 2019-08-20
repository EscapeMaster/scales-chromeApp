const {chrome} = window ,
  {app} = chrome;

// 启动时打开主界面
app.runtime.onLaunched.addListener( function () {
  app.window.create( '/app/index.html' , {
    'bounds' : {
      'width' : 500 ,
      'height' : 500
    }
  } );
} );
