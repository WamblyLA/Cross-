import { useMemo, useState } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { useThemeVariable } from "../../hooks/useThemeVariable";

type AutoHeightHtmlWebViewProps = {
  html: string;
  minHeight?: number;
  maxHeight?: number;
  javaScriptEnabled?: boolean;
};

const HEIGHT_SCRIPT = `
  (function () {
    function sendHeight() {
      var bodyHeight = document.body ? document.body.scrollHeight : 0;
      var docHeight = document.documentElement ? document.documentElement.scrollHeight : 0;
      var height = Math.max(bodyHeight, docHeight, 120);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(String(height));
      }
    }

    window.addEventListener('load', sendHeight);
    setTimeout(sendHeight, 50);
    setTimeout(sendHeight, 250);
    setTimeout(sendHeight, 800);
    true;
  })();
`;

export function AutoHeightHtmlWebView({
  html,
  minHeight = 160,
  maxHeight = 520,
  javaScriptEnabled = true,
}: AutoHeightHtmlWebViewProps) {
  const background = useThemeVariable("--bg-input", "#101913");
  const [height, setHeight] = useState(minHeight);

  const frameStyle = useMemo(
    () => ({
      backgroundColor: background,
      height,
    }),
    [background, height],
  );

  return (
    <View className="will-change-variable overflow-hidden rounded-lg border border-default bg-input">
      <WebView
        injectedJavaScript={HEIGHT_SCRIPT}
        javaScriptEnabled={javaScriptEnabled}
        onMessage={(event) => {
          const nextHeight = Number.parseInt(event.nativeEvent.data, 10);

          if (!Number.isFinite(nextHeight)) {
            return;
          }

          setHeight(Math.max(minHeight, Math.min(maxHeight, nextHeight)));
        }}
        originWhitelist={["*"]}
        scrollEnabled={height >= maxHeight}
        source={{ html }}
        style={frameStyle}
      />
    </View>
  );
}
