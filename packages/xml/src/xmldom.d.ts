declare module 'xmldom' {
  const xmldom: {
    DOMImplementation: new () => import('@journeyapps/domparser/types.js').DOMImplementation;
    XMLSerializer: new () => import('@journeyapps/domparser').XMLSerializer;
  };
  export default xmldom;
}
