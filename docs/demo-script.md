# Demo Script

## Segment 1: Basic Voice Drawing

1. `画一个红色圆形`
2. `画一个蓝色矩形`
3. `在中间写“用户登录”`
4. Show command log and local parser source.

## Segment 2: Voice Editing

1. `选中蓝色的矩形`
2. `把它往右移动一点`
3. `把它放大 20%`
4. `把它改成绿色`
5. `撤销上一步`

## Segment 3: Flowchart Generation

Say:

```text
画一个登录流程图，从输入账号密码开始，接着校验信息，成功后进入首页，失败后提示重新输入
```

Expected result:

- AI parser creates Mermaid or structured commands.
- Flowchart appears as editable Excalidraw vector elements.
- Bottom bar increments AI call count and cost estimate.

## Resilience Moment

Create two red circles, then say `删除红色圆形`. VoiceDraw should ask for clarification instead of deleting randomly.
