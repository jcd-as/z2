 // babel.config.js
module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: {
                    esmodules: true,
                },
                modules: "false"
            },
        ],
    ],
    "plugins":
        ["transform-optional-chaining", "@babel/proposal-class-properties", "@babel/proposal-private-methods"]
}
