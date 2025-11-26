module.exports = function({ types: t }) {
  return {
    name: 'import-meta-fix',
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
          // Replace import.meta with an object that has url property
          if (path.parent.property && path.parent.property.name === 'url') {
            // Replace import.meta.url with window.location.href for web
            path.parentPath.replaceWith(
              t.memberExpression(
                t.memberExpression(t.identifier('window'), t.identifier('location')),
                t.identifier('href')
              )
            );
          } else {
            // Replace import.meta with an empty object for other cases
            path.replaceWith(t.objectExpression([]));
          }
        }
      }
    }
  };
};
