// from swr
import { isDocumentVisible } from './utils';
var listeners = [];

function subscribe(listener) {
  listeners.push(listener);
  return function unsubscribe() {
    var index = listeners.indexOf(listener);
    listeners.splice(index, 1);
  };
}

var eventsBinded = false;

if (typeof window !== 'undefined' && window.addEventListener && !eventsBinded) {
  var revalidate = function revalidate() {
    if (!isDocumentVisible()) return;

    for (var i = 0; i < listeners.length; i++) {
      var listener = listeners[i];
      listener();
    }
  };

  window.addEventListener('visibilitychange', revalidate, false); // only bind the events once

  eventsBinded = true;
}

export default subscribe;