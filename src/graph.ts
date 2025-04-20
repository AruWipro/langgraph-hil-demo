import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { Command, END, InMemoryStore, interrupt, MemorySaver, MessagesAnnotation, START, StateGraph } from "@langchain/langgraph";
import { foodOrderAgent } from "./agents/FoodOrderingAgent";
import { placeOrder } from "./tools/placeOrder";

const inMemory = new InMemoryStore({
   
});
 
 
function humanApproval(state: typeof MessagesAnnotation.State): Command {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    const toolCall = lastMessage.tool_calls![0]
    let question = `Can I go ahead and order ${toolCall.args.quantity} ${toolCall.args.dishName}?`
    let isApproved: string;
    while (true) {
        console.log(`Interrupting Agein---${question}`)
        isApproved = interrupt({
            question,
        });
        console.log(`Is Approved --- ${isApproved}`)
        if (isApproved?.toLowerCase().trim() == 'yes' || isApproved?.toLowerCase().trim() == 'no') {
            break;
        } else {
            question = `Please say either Yes or No to proceed wiht your order`
        }
    }
    return new Command({ goto: 'executeOrder' })
 
}
 
 
async function executeTool(state: typeof MessagesAnnotation.State): Promise<Partial<typeof MessagesAnnotation.State>> {
    console.log('Order Placed..')
    const newMessages: ToolMessage[] = [];
    const tools = { placeOrder };
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    const toolCalls = lastMessage.tool_calls!;

    for (const toolCall of toolCalls) {
        const tool = tools[toolCall.name as keyof typeof tools];
        const result = await tool.invoke(toolCall.args as { dishName: string; quantity: number });
        newMessages.push(new ToolMessage({
            name: toolCall.name,
            content: result,
            tool_call_id: toolCall.id || ''
        }));

    }
    const emoji = '🍽️ 🎉 ✅';
    return { messages: [...newMessages, new AIMessage({ content: 'Your order for ' + toolCalls[0].args.quantity + ' ' + toolCalls[0].args.dishName + ' 🍕 has been placed successfully!! ' + emoji })] };
}

// Configure users favourate food items in memory
 
const nameSpace = ['Aravind', 'memories'];
const key = 'fav_food'
const value = { text: 'Food Preferences: Indian, Pizza, ice creams, especially south indian cusine' }
inMemory.put(nameSpace, key, value).then(() => console.log(`Records saved~~~`))
 
 
const checkAfterLLM = (state: typeof MessagesAnnotation.State) => {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    if (!lastMessage.tool_calls?.length) {
        return END
    } return 'humanApproval'
}

const workflow = new StateGraph(MessagesAnnotation)
    .addNode('curator', foodOrderAgent)
    .addNode('humanApproval', humanApproval, { ends: ['executeOrder'] })
    .addNode('executeOrder', executeTool)
    .addEdge(START, 'curator')
    .addConditionalEdges('curator', checkAfterLLM)
    .addEdge('executeOrder', END)
 
 
const memory = new MemorySaver();
export const graph = workflow.compile({ checkpointer: memory, store: inMemory });
 