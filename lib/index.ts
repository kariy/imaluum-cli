import commander from 'commander'
import { Runner, Commands } from './runner'

export default async () => {
    const runner = new Runner(new commander.Command())

    runner.program.name('imaluum')
        .description('A tool to access i-ma\'luum directly from your command line.')
        .version('0.0.1')

    runner.program.command("result").description("Get your examination result.")
        .argument('<semester>')
        .argument('<year>', 'Year of the semester. MUST BE IN THE FORMAT XXXX/XXXX (e.g. 2021/2022)')
        .action(async (semester: string, year: string) => {
            await runner.execute(Commands.Result, {
                semester,
                year
            })
        })

    runner.program.command("login")
        .description("Authenticate by providing your username and password for i-ma\'luum")
        .action(async () => {
            await runner.authenticate()
        })

    runner.program.command('test')
        .action(async () => {
            await runner.execute(Commands.Test, {})
        })

    await runner.program.parseAsync()
}
