import {getCache} from './cache';

export default () => {
	if(getCache('root')){
		window.dispatchEvent(new CustomEvent('icestark:not-found'))
		return null
	}
	return "Current sub-application is running independently";
}
