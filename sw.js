const CACHE="zuletzt-v1";

const FILES=[
"/",
"index.html",
"styles.css",
"app.js",
"manifest.json"
];

self.addEventListener("install",e=>{

e.waitUntil(

caches.open(CACHE).then(cache=>cache.addAll(FILES))

);

});

self.addEventListener("fetch",e=>{

e.respondWith(

caches.match(e.request).then(r=>r||fetch(e.request))

);

});
