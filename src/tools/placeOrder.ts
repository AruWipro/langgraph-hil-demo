import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

export const placeOrder = new DynamicStructuredTool({
    name: "placeOrder",
    description: "Place an order for a food item",
    schema: z.object({
        dishName:z.string().describe("The name of the food item to order"),
        quantity:z.number().describe("The quantity of the food item to order"),
    }),
    func: async ({dishName: name, quantity}) => {
        console.log(`Placing order for ${quantity} ${name}`);
        return `Order placed for ${quantity} ${name}`;
    }
})