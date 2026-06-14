# Supported Commands

## Local Rule Commands

| Spoken command | Intent | Notes |
| --- | --- | --- |
| 画一个红色圆形 | `create_shape` | Supports colors and shape words. |
| 画一个蓝色矩形 | `create_shape` | Default position is center. |
| 画一个黄色菱形 | `create_shape` | Diamond maps to Excalidraw diamond. |
| 在中间写“用户登录” | `create_shape` | Creates a text element. |
| 画一条从圆形到矩形的箭头 | `connect` | Resolves shape targets by memory. |
| 选中刚才的圆形 | `select_shape` | Updates selected target. |
| 把它改成绿色 | `update_shape` | Uses selected or last target. |
| 把刚才的矩形放大一点 | `update_shape` | Default scale is 1.2. |
| 把圆形移动到左边 | `move_shape` | Absolute position or relative direction. |
| 删除刚才的箭头 | `delete_shape` | Deletes only after target validation. |
| 撤销上一步 | `undo` | Uses app-level history snapshots. |
| 清空画布 | `clear_canvas` | Clears elements and memory. |
| 导出图片 | `export_image` | Downloads PNG. |
| 画一个红色圆形，然后画一个蓝色矩形，再画一条从圆形到矩形的箭头 | multiple intents | Splits local commands by sequence words and executes them step by step. |
| 画一个蓝色矩形，然后把它放大一点，再把它改成绿色 | multiple intents | Later steps can use the selected object created by earlier steps. |

## Voice-Only Confirmation

When a target is ambiguous, VoiceDraw shows candidate numbers but does not expose click-to-confirm drawing actions. Continue by voice:

| Spoken answer | Result |
| --- | --- |
| 选第一个 / 第一个 | Chooses the first candidate. |
| 左边那个 / 右边那个 | Chooses by canvas position. |
| 选择“登录”这个 | Chooses by text or alias. |
| 取消 | Cancels the pending confirmation. |

## AI Commands

Commands with `流程图`, `从`, `然后`, `接着`, `成功后`, or `失败后` are treated as complex. The API should return:

```json
{
  "commands": [],
  "mermaid": "flowchart TD\nA[输入账号密码] --> B{校验信息}",
  "estimatedCost": 0.001,
  "explanation": "生成登录流程图"
}
```

## Failure Feedback

| Condition | Feedback |
| --- | --- |
| Missing target | 没有找到对应对象，请换一种说法。 |
| Multiple targets | 找到多个对象，请说明要操作左边的、右边的或具体文字。 |
| Missing API key | AI 解析未配置，基础绘图仍可使用。 |
| Invalid AI JSON | AI 返回格式无效，请重试或改成分步指令。 |
