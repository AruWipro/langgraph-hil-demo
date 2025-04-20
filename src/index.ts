import { HumanMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { Command } from "@langchain/langgraph";
import dotenv from 'dotenv';
import express from 'express';
import { traceable } from "langsmith/traceable";
import { graph } from './graph';

const app = express();
const port = process.env.PORT || 3000;

//load config from .env file
dotenv.config();


app.use(express.json());

app.post('/chat', async (req:any, res:any) => {
    try {
        const { message, userId, sessionId } = req.body;
        
        if (!message || !userId || !sessionId) {
            return res.status(400).json({ error: 'Message and userId and sessionId are required' });
        }

        // Initialize the graph state with a human message
        const initialState = {
            messages: [new HumanMessage({
                content: message,
                additional_kwargs: { userId, sessionId }
            })]
        };

        // Run the graph
        // Create a Runnable config object with thread_id as sessionId and also pass userId  

        const config:RunnableConfig = {
            configurable: {
                thread_id: sessionId,
                user_id: userId
            }
        };

        const preState = await graph.getState(config);
        let result:any;
        if(preState.next.length > 0) {
            result = await traceable(async () => {
                const result:any = await graph.invoke(new Command({resume:message}),config);
                return result;
            },{metadata: {session_id: sessionId}})
                
        }else{
            result = await traceable(async () => {
                const result:any = await graph.invoke(initialState, config);
                return result;
            },{metadata: {session_id: sessionId}})
        }
        
        const graphResponse = await result();
        // get state from config and see if there are any interruptions
        const postState = await graph.getState(config);
        console.log(`State Next: ${JSON.stringify(postState.next)}`);
        // State Next: ["humanApproval"]
        console.log(`State Tasks: ${JSON.stringify(postState.tasks)}`);
        // State Tasks: [{"id":"8290043e-8416-55ed-a0fa-81b8fd1ae52e","name":"humanApproval","path":["__pregel_pull","humanApproval"],"interrupts":[{"value":{"question":"Can I go ahead and order 1 Sambar Vada?"},"when":"during","resumable":true,"ns":["humanApproval:8290043e-8416-55ed-a0fa-81b8fd1ae52e"]}]}]

        // get the task from the state
        const interrupt = postState.tasks?.[0]?.interrupts?.[0];
        const question = interrupt?.value?.question;
        const lastMessage = graphResponse.messages[graphResponse.messages.length - 1];
        if(question) {
        res.json({ 
                question: question,
            });
        } else {
            res.json({ 
                message: lastMessage.content
        });
        }

    } catch (error) {
        console.error('Error processing order:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 