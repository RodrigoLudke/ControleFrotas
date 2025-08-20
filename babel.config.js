// babel.config.js
module.exports = function(api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            'expo-router/babel',
            'transform-inline-environment-variables',
        ],
    };
};