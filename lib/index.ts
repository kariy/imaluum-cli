import commander from 'commander'
import { Runner, CommandEnum } from './runner'

export default async () => {
    const runner = new Runner(new commander.Command())

    runner.program.name('imaluum')
        .description('A tool to access i-ma\'luum directly from your command line.')
        .version('0.0.1')

    runner.program.command("result").description("Get your examination result.")
        .argument('<semester>', ' Must be in the range of 1 >= semester <= 3.')
        .argument('<year>', 'Year of the semester. MUST BE IN THE FORMAT XXXX/XXXX (e.g. 2021/2022)')
        .option('-w, --width <width>', 'Set table output width.', '90')
        .action(async (semester: string, year: string, options) => {
            await runner.execute(CommandEnum.Result, {
                semester,
                year,
                options
            })
        })

    runner.program.command('timetable')
        .description('Show class timetabl for the given semester.')
        .argument('<semester>', ' Must be in the range of 1 >= semester <= 3.')
        .argument('<year>', 'Year of the semester. MUST BE IN THE FORMAT XXXX/XXXX (e.g. 2021/2022)')
        .option('-w, --width <width>', 'Set table output width.', '90')
        .action(async (semester: string, year: string, options) => {
            await runner.execute(CommandEnum.Timetable, { semester, year, options })
        })

    runner.program.command("login")
        .description("Authenticate by providing your username and password for i-ma\'luum")
        .action(async () => {
            await runner.authenticate()
        })

    runner.program.command('test')
        .action(async () => {
            await runner.execute(CommandEnum.Test, {})
        })

    await runner.program.parseAsync()
}
