declare module 'xmldom' {
  const xmldom: {
    DOMImplementation: new () => import('@journeyapps/domparser').DOMImplementation;
    XMLSerializer: new () => import('@journeyapps/domparser').XMLSerializer;
  };
  export default xmldom;
}
