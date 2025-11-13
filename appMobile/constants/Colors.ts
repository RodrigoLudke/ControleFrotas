/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#0a7ea4';

export const Colors = {
    light: {
        text: '#11181C',
        textBack: '#f2f2f2',
        background: '#fff',
        card: '#f2f2f2',
        border: '#d9d9d9',
        primary: tintColorLight,
        tint: tintColorLight,
        icon: '#333333',
        iconBack: '#dbdbdb',
        tabIconDefault: '#687076',
        tabIconSelected: tintColorLight,
    },
    dark: {
        text: '#ECEDEE',
        textBack: '#f2f2f2',
        background: '#151718',
        card: '#1e1f21',
        border: '#333333',
        primary: tintColorDark,
        tint: tintColorDark,
        icon: '#e6e6e6',
        iconBack: '#dbdbdb',
        tabIconDefault: '#9BA1A6',
        tabIconSelected: tintColorDark,
    },
};
