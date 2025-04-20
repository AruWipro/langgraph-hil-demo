import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { InMemoryStore, LangGraphRunnableConfig, MessagesAnnotation } from "@langchain/langgraph";
import { llm } from "../llm";
import { placeOrder } from "../tools/placeOrder";

const framePrompt = async (
  state: typeof MessagesAnnotation.State,
  config: LangGraphRunnableConfig
) => {
  const store = config.store as InMemoryStore;
  const userId = config.configurable?.user_id;

  // Get Memories from the memory store and add to the prompt
  const memories: any = await store.get([userId, "memories"], "fav_food");
  
  // Iterate over memories and join them with a new line
  const memoriesString = memories.value.text;

  return `You are a helpful assistant that can help with food ordering. Curate menu based on his preferences. Always collect the dishName and quantity before placing the order.
  Here are users food preferences: ${memoriesString}. Curate the menu based on the users preferences.`;
};

export async function foodOrderAgent(
  state: typeof MessagesAnnotation.State,
  config: LangGraphRunnableConfig
) {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", await framePrompt(state, config)],
    new MessagesPlaceholder("messages"),
  ]);

  const response = await prompt.pipe(llm(config).bindTools([placeOrder])).invoke({
    messages: state.messages,
  });

  return {
    messages: [response],
  };
}
