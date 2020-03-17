 // babel.config.js
module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: {
                    node:
                        'current',
                },
            },
        ],
    ],
    "plugins":
        ["transform-optional-chaining", "@babel/proposal-class-properties"]
}
